declare module '@heyputer/puter.js' {
  interface PuterAI {
    chat: (
      prompt: string,
      options?: { model?: string }
    ) => Promise<{ message: { content: string } }>
  }

  interface PuterInstance {
    ai: PuterAI
  }

  const puter: PuterInstance
  export default puter
}