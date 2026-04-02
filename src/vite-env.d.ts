/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*?url' {
  const content: string;
  export default content;
}

declare module '*?worker' {
  const content: new () => Worker;
  export default content;
}
