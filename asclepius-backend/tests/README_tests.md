# Testes e2e rápidos
# Pré-requisitos
- API em execução (`npm run dev`)
- Admin existente:
```powershell
$env:ADMIN_EMAIL="admin@vidaplus.com"
$env:ADMIN_PASSWORD="VidaPlus@2025"
npm run user:ensure-admin

=============================================
Executar o fluxo completo
=============================================
$env:ASCLEPIUS_BASE="http://localhost:3001"
$env:ASCLEPIUS_ADMIN_EMAIL="admin@vidaplus.com"
$env:ASCLEPIUS_ADMIN_PASSWORD="VidaPlus@2025"
npm run test:e2e