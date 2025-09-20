export const editorTheme = {
  root: "font-sans", // Add this to use your default font
  paragraph: "mb-2 font-inherit", // Add font-inherit
  heading: {
    h1: "text-4xl font-bold mb-4 font-inherit",
    h2: "text-3xl font-bold mb-3 font-inherit",
    h3: "text-2xl font-bold mb-2 font-inherit",
    h4: "text-xl font-bold mb-2 font-inherit",
    h5: "text-lg font-bold mb-1 font-inherit",
  },
  list: {
    nested: {
      listitem: "list-none",
    },
    ol: "list-decimal ml-4 font-inherit",
    ul: "list-disc ml-4 font-inherit",
    listitem: "margin-left-2 font-inherit",
  },
  link: "text-blue-600 hover:underline cursor-pointer font-inherit",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono",
  },
  code: "block bg-gray-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm my-2",
}