// C:\Projetos\VidaPlus\asclepius-frontend\scripts\diag_cpf_toggle_flow.mjs
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACK_URL = process.env.BACK_URL || 'http://localhost:3001';
const HEADED   = process.argv.includes('--headed');

function onlyDigits(s){return (s||'').replace(/\D+/g,'');}
function validateCPF(cpf){
  const c=onlyDigits(cpf);
  if(c.length!==11||/^(\d)\1+$/.test(c))return false;
  let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);
  let d=11-(s%11);if(d>9)d=0;if(d!==+c[9])return false;
  s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);
  d=11-(s%11);if(d>9)d=0;return d===+c[10];
}
async function pingHealth(){
  try{const r=await fetch(`${BACK_URL}/health`);return {ok:r.ok,status:r.status,body:await r.text()};}
  catch(e){return{ok:false,error:String(e)}}
}
async function save(outDir,name,data){
  await mkdir(outDir,{recursive:true});
  await writeFile(join(outDir,name),data,'utf8');
}
async function saveJson(outDir,name,obj){
  await save(outDir,name,JSON.stringify(obj,null,2));
}

async function findCPFField(page){
  const cands = [
    'input[placeholder="000.000.000-00"]',
    'input[name="cpf"]',
    'input[id="cpf"]',
    'input[id*="cpf" i]',
    'input[name*="cpf" i]',
    'input[type="text"][inputmode="numeric"]',
  ];
  for(const sel of cands){
    const loc = page.locator(sel).first();
    if(await loc.count()) return loc;
  }
  // via label “CPF”
  const label = page.locator('label:has-text("CPF")').first();
  if(await label.count()){
    // procura o primeiro input depois do label
    const sib = label.locator('xpath=following::input[1]').first();
    if(await sib.count()) return sib;
  }
  // via aria
  const byRole = page.getByLabel(/CPF/i).first();
  if(await byRole.count()) return byRole;

  return null;
}

async function run(){
  const outDir = join(process.cwd(),'scripts','diag-out');
  console.log('=== DIAG CPF TOGGLE FLOW ===');
  console.log({ BASE_URL, BACK_URL });

  const health = await pingHealth();
  console.log('backend /health:', health);
  await saveJson(outDir,'health.json',health);

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ recordHar:{ path: join(outDir,'network.har'), mode:'minimal'} });
  const page = await context.newPage();

  const httpLog=[];
  page.on('request', req=>{
    httpLog.push({t:'req', m:req.method(), u:req.url(), body:req.postData()||null});
  });
  page.on('response', async res=>{
    const body = await res.text().catch(()=> '');
    httpLog.push({t:'res', s:res.status(), u:res.url(), body: body.slice(0,1000)});
  });

  // Lista de pacientes
  await page.goto(`${BASE_URL}/patients`, { waitUntil:'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(()=>{});

  // Tenta filtro "Todos"
  try{
    const combo = page.locator('select, [role="combobox"]').first();
    if(await combo.count()){
      await combo.selectOption({label:/Todos/i}).catch(async ()=>{
        await combo.click();
        await page.getByRole('option',{name:/Todos/i}).first().click();
      });
    }
  }catch{}

  // Abrir um "Inativo" por botão Editar ou clique na linha
  let opened=false;
  try{
    const row = page.locator('tr:has-text("Inativo")').first();
    if(await row.count()){
      const edit = row.getByRole('button',{name:/Editar/i}).first();
      if(await edit.count()){ await edit.click(); opened=true; }
      else { await row.click(); opened=true; }
    }
  }catch{}
  if(!opened){
    const first = page.locator('tbody tr').first();
    if(await first.count()){ await first.click(); opened=true; }
  }

  // Aguarda formulário
  await page.waitForTimeout(800);

  // Dump de HTML e screenshot antes de procurar CPF
  await save(outDir,'form-dom.html', await page.content());
  await page.screenshot({ path: join(outDir,'form.png'), fullPage:true });

  // Localiza campo CPF
  const cpfField = await findCPFField(page);
  if(!cpfField){
    console.error('FALHA: input CPF não localizado.');
    await saveJson(outDir,'http-log.json',httpLog);
    await browser.close();
    console.log('Saídas em:', outDir);
    process.exit(2);
  }

  const cpfMasked = await cpfField.inputValue().catch(()=> '');
  const cpfDigits = onlyDigits(cpfMasked);
  console.log('CPF atual:', { masked: cpfMasked, digits: cpfDigits, validByScript: validateCPF(cpfDigits) });

  // Marca “Cadastro ativo”
  try{
    const chk = page.getByLabel(/Cadastro ativo/i).first();
    if(await chk.count()){ if(!(await chk.isChecked())) await chk.check(); }
    else if(await page.locator('#isActive').count()){ await page.locator('#isActive').check(); }
  }catch(e){ console.warn('check isActive falhou:', String(e)); }

  // Envia
  const submit = page.getByRole('button',{name:/Salvar|Criar/i}).first();
  if(await submit.count()) await submit.click();
  else await cpfField.press('Enter');

  // Espera possível erro
  let cpfErr=false;
  try{
    await page.getByText(/CPF inválido/i).first().waitFor({state:'visible',timeout:2500});
    cpfErr=true;
  }catch{}
  console.log('Erro de CPF visível:', cpfErr);

  // Captura último payload /patients
  const sent = httpLog.filter(e=>e.t==='req' && /\/patients(\/|$)/.test(e.u) && (e.m==='PUT'||e.m==='POST'));
  const last = sent.at(-1);
  let lastBody=null, lastDigits='', lastValid=null;
  if(last){
    try{ lastBody = JSON.parse(last.body||'{}'); }catch{ lastBody = { raw:last.body||'' }; }
    const c = String(lastBody?.cpf ?? '');
    lastDigits = onlyDigits(c);
    lastValid = validateCPF(lastDigits);
  }
  await saveJson(outDir,'last-payload.json',{ lastBody, lastDigits, lastValid });
  await saveJson(outDir,'http-log.json',httpLog);

  await browser.close();
  console.log('OK. Artefatos em:', outDir);
  console.log('=== FIM ===');
}

run().catch(e=>{ console.error(e); process.exit(1); });
