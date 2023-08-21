module.exports = {
  name: "lcui-app",
  children: [
    {
      name: "resource",
      attributes: { type: "text/css", src: "home.css" },
    },
    {
      name: "resource",
      attributes: {
        type: "application/font-ttf",
        src: "iconfont.ttf",
      },
    },
    {
      name: "ui",
      children: [
        {
          name: "text",
          children: [{ type: "text", text: "Enter a message and save it." }],
        },
        {
          name: "textedit",
          attributes: {
            ref: "input-message",
            placeholder: "eg: hello, world!",
          },
        },
        {
          name: "button",
          attributes: { ref: "btn-save-message" },
          children: [{ type: "text", text: "Save" }],
        },
        {
          name: "text",
          attributes: { ref: "feedback", class: "feedback" },
          children: [{ type: "text", text: "Message has been saved!" }],
        },
      ],
    },
  ],
};
