# @lcui/react

([中文](README.zh-cn.md)/**English**)

A React library for LCUI application development, providing TypeScript type declarations and React version preset components that need to be used in conjunction with [@lcui/cli](https://github.com/lcui-dev/lcui-cli).

## Installation

```sh
npm install -D @lcui/react react @types/react
```

## Usage

```tsx
import { Text, TextInput } from '@lcui/react';
import styles from './app.module.css';

export default function App() {
  return (
    <div className={styles.app}>
      <Text>Hello, World!</Text>
      <TextInput placeholder="Please input..." />
    <div>
  );
}
```

LCUI is not a browser engine, and functions such as text display and input need to be implemented by specific components. Therefore, there may be the following differences in JSX writing:

```diff
  <div className={styles.app}>
-   Hello, World!
+   <Text>Hello, World!</Text>
-   <input placeholder="Please input..." />
+   <TextInput placeholder="Please input..." />
  <div>
```

## License

[MIT](./LICENSE)
