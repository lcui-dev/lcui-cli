# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![codecov](https://codecov.io/gh/lc-ui/lcui-cli/branch/master/graph/badge.svg?token=USK2SXHC86)](https://codecov.io/gh/lc-ui/lcui-cli)

## Introduction

(**English**/[中文](README.zh-cn.md))

LCUI CLI is command line interface for rapid LCUI development. providing:

- Mininal LCUI project template
- Generator for components and views
- Internationalization (i18n)

## Quick start

Before using this tool, you need install the following tools on your computer:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com))
- [LCPkg](https://github.com/lc-soft/lcpkg):
    ```shell
    npm install -g lcpkg
    lcpkg setup
    ```
- [CMake](https://cmake.org/) or [XMake](https://xmake.io/)

To install the new package, use one of the following commands. You need administrator privileges to execute these unless npm was installed on your system through a Node.js version manager (e.g. n or nvm).

``` bash
npm install -g @lcui/cli
# OR
yarn global add @lcui/cli
```

Then run the following commands:

``` bash
# Create a porject
lcui create my-project

# Enter the project directory
cd my-project

# set up the development environment for this project
lcui setup

# Build project
lcui build

# run project
lcui run
```

If you are ready to develop an LCUI application, you can try the following commands:

``` bash
# Create a component (widget)
lcui generate widget MyWidget

# Create a view
lcui generate view MyView

# Create a internationalization (i18n) config file
lcui generate i18n

# Compile i18n config file to C code. (default compile config/i18n.js to src/lib/i18n.c and src/lib/i18n.h)
lcui compile i18n
```

## License

[MIT](LICENSE)
