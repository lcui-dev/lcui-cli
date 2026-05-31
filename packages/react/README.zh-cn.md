# @lcui/react

(**中文**/[English](README.md))

一个用于 LCUI 应用程序开发的 React 库，提供 TypeScript 类型声明、React 版预置组件，配合 [@lcui/cli](https://gitee.com/lcui-dev/lcui-cli) 使用。

## 安装

```sh
npm install -D @lcui/react
```

## 使用

```tsx
import { useState, useRef, TextInput, Button } from '@lcui/react';
import styles from './app.module.css';

export default function App() {
  const inputRef = useRef();
  const [name, setName] = useState('World');

  return (
    <div className={styles.app}>
      Hello, {name}!
      <TextInput ref={inputRef} placeholder="Please input..." />
      <Button onClick={() => setName(inputRef.current.value)}>Change</Button>
    </div>
  );
}
```

LCUI 并不是浏览器引擎，像按钮、文本输入框等原生控件需要由特定的 LCUI 组件实现，因此，在 JSX 写法上会有如下差异：

```diff
  <div className={styles.app}>
    Hello, World!
-   <input placeholder="Please input..." />
+   <TextInput placeholder="Please input..." />
-   <button>Click here</button>
+   <Button>Click here</Button>
  <div>
```

## 许可

[MIT](./LICENSE)
