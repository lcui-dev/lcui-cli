# Fluent UI System Icons

(**中文**/[English](README.md))

[Fluent UI 系统图标](https://github.com/microsoft/fluentui-system-icons)是一组来自微软的熟悉、友好和现代的图标。

本项目基于 [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) 的图标文件重新生成图标库，适合 LCUI 应用程序使用，具体生成规则可查看文件：[scripts/convert.js](scripts/convert.js)

![Fluent System Icons](art/readme-banner.png)

## 安装

```sh
npm install @lcui/react-icons
```

## 使用

要使用这些图标，你需要先在你的根组件文件中引入 css 文件：

```tsx
// src/App.tsx

import '@lcui/react-icons/dist/style.css';
```

然后用 `import { [IconName][Style] } from @lcui/react-icons` 来引入它们。例如：

```tsx
// src/MyComponent.tsx

import { AccessTime, AccessTimeFilled } from '@lcui/react-icons';
import styles from './MyCompoennt.module.css';

export default function MyComonent() {
  return (
    <div>
      <AccessTime className={styles.icon} size={24} />
      <AccessTimeFilled className={styles.icon} />
    </div>
  );
}
```

图标有 Regular 和 Filled 两种风格，其中 Regular 是默认风格，用 `AccessTime` 即可，无需写成 `AccessTimeRegular`。

如果你不喜欢这种用法，也可以只用 `Icon` 组件：

```tsx
// src/MyComponent.tsx

import { Icon } from '@lcui/react-icons';
import styles from './MyCompoennt.module.css';

export default function MyComonent() {
  return (
    <div>
      <Icon name="access-time" className={styles.icon} size={24} />
      <Icon name="access-time" className={styles.icon} filled />
    </div>
  );
}
```

如果你不喜欢写 TypeScript React 代码，也可以在 C 代码中这么用：

```c
#include <LCUI.h>

...

int main(int argc, char **argv)
{
  ui_widget_t *icon;

  lcui_init();

  ui_load_css_file("FluentSystemIcons-Regular.css");
  ui_load_css_file("FluentSystemIcons-Filled.css");

  icon = ui_create_widget("text"):
  ui_widget_add_class(icon, "fui-icon-regular access-time-24-regular");
  ui_widget_set_style_unit_value(w, css_prop_font_size, 24, CSS_UNIT_PX)
  ui_root_append(icon);

  icon = ui_create_widget("text"):
  ui_widget_add_class(icon, "fui-icon-filled access-time-24-filled");
  ui_root_append(icon);

  return lcui_main();
}
```

之后，手动复制 `node_modules/@lcui/react-icons/dist` 目录内的 css 和 ttf 文件到应用程序工作目录内。

## 更新

下载 [fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons) 最新源码包，解压其中的 fonts 目录到本项目目录内，然后运行：

```sh
npm run build
```

## 许可

[MIT](./LICENSE)
