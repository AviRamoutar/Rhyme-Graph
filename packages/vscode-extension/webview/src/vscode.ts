declare function acquireVsCodeApi(): {
  postMessage(msg: any): void;
  getState(): any;
  setState(state: any): void;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | null = null;

export function getVsCodeApi() {
  if (!vscodeApi) {
    try {
      vscodeApi = acquireVsCodeApi();
    } catch {
      // Running outside VS Code (e.g., dev mode)
      vscodeApi = {
        postMessage: (msg: any) => console.log('vscode.postMessage:', msg),
        getState: () => null,
        setState: () => {},
      };
    }
  }
  return vscodeApi;
}

export function postMessage(msg: any): void {
  getVsCodeApi().postMessage(msg);
}
