import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] grid place-items-center p-4">
          <div className="bg-white border rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-red-600" />
              <h2 className="font-semibold">Ops! Algo deu errado</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">Tente recarregar a página.</p>
            <button onClick={() => location.reload()} className="w-full bg-blue-600 text-white rounded-lg py-2">
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
