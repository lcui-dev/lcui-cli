# [1.0.0-beta.2](https://github.com/lc-ui/lcui-cli/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2024-05-12)


### Bug Fixes

* ERR_MODULE_NOT_FOUND ([b940da0](https://github.com/lc-ui/lcui-cli/commit/b940da0bc40a8ffcc014733769975ced803db673))



# [1.0.0-beta.1](https://github.com/lc-ui/lcui-cli/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2024-05-12)


### Bug Fixes

* **ui-loader:** 纠正组件 ident ([865a2e5](https://github.com/lc-ui/lcui-cli/commit/865a2e544ab56fb6f240d1da90e08468890acd30))


### Features

* **ui-loader:** 支持声明头文件包含 ([026ec0c](https://github.com/lc-ui/lcui-cli/commit/026ec0c31c81b3f774efae59d34caf808ed836af))
* 编译完资源文件后执行 xmake ([414604c](https://github.com/lc-ui/lcui-cli/commit/414604c9c0e331c63bebe4c03fcca48d705421df))
* 从项目目录内加载 postcss 配置 ([10f75c9](https://github.com/lc-ui/lcui-cli/commit/10f75c948b5fa94e9302e6058d3efd02c313a74f))
* 改进 React 组件的编译 ([a2c7a4e](https://github.com/lc-ui/lcui-cli/commit/a2c7a4e61802c945b4336f38eb2dda016f52e5de))
* 生成 UI 初始化代码和示例 main() 函数代码 ([0dafd1d](https://github.com/lc-ui/lcui-cli/commit/0dafd1dbcf37e4aa31dd129906d36a487b2200da))
* 替换 react/jsx-runtime ([d6c1e46](https://github.com/lc-ui/lcui-cli/commit/d6c1e467e43f5db815bb6feaf290f4b374b869ef))
* 添加 AppRouter 编译器 ([9e8e40f](https://github.com/lc-ui/lcui-cli/commit/9e8e40f178923e8cc2ddf2aeec00baa29f537f57))
* 添加 hooks 和 UIPlugin，存储所有组件信息 ([d032b51](https://github.com/lc-ui/lcui-cli/commit/d032b51b58ad86252fffeebbcff3a50a643071a5))
* 为 ts-loader 添加 AppRouter 生成目标 ([37d4fbb](https://github.com/lc-ui/lcui-cli/commit/37d4fbbaa754a543c55e3fd4898e5b17d20f6973))
* compile 命令的 filePath 参数默认值为 app 目录 ([077d5fb](https://github.com/lc-ui/lcui-cli/commit/077d5fbd9ac8c290f4b710bc2ac6a96f8d7bf364))
* compile 命令更名为 build ([722ddb9](https://github.com/lc-ui/lcui-cli/commit/722ddb9f53bc01e9e08e823567d93b642231ed2c))



# [1.0.0-beta.0](https://github.com/lc-ui/lcui-cli/compare/v0.4.0...v1.0.0-beta.0) (2023-12-16)


### Bug Fixes

* typo ([6a72178](https://github.com/lc-ui/lcui-cli/commit/6a72178f68ef27c688e27442e6a25d8f21a93421))
* **compile:** convert text to a UTF-8 array to solve the encoding problem of C source files ([914860c](https://github.com/lc-ui/lcui-cli/commit/914860c1d733878ad4a69faaaef70e1100022f99))
* **compile:** incorrect file output path ([b5e8926](https://github.com/lc-ui/lcui-cli/commit/b5e892616dc6bdae338db9427d9b7e33d1ec40ea))
* **compile:** incorrect resource output path ([9cfc622](https://github.com/lc-ui/lcui-cli/commit/9cfc62290a838efe3ca4459399edf180f73ce484))
* **compile:** module should be generated after dependencies ([d71bc50](https://github.com/lc-ui/lcui-cli/commit/d71bc50b714a9ed6b6a6364d43002a8dee21eff9))
* **compiler:** create folder before emitting files ([7cb8071](https://github.com/lc-ui/lcui-cli/commit/7cb80711e064fda66ee491ec6e882a13992c0e4a))
* **compiler:** incorrect text definition code ([6c7ee53](https://github.com/lc-ui/lcui-cli/commit/6c7ee539b47668f7bcb2686a8c79cd2901f87b27))
* **compiler:** module resolve and compile errors ([8f47fdb](https://github.com/lc-ui/lcui-cli/commit/8f47fdb6a1860f01f81aa88e792338c73251238c))


### Features

* **compile:**  auto create widget prototype ([423891a](https://github.com/lc-ui/lcui-cli/commit/423891ac30cbffbdf6a0bb86e75fde4d0f62b279))
* **compile:** add `style` attribute support ([29caa7b](https://github.com/lc-ui/lcui-cli/commit/29caa7b40f410d83e894421644a42ff401ba0c5b))
* **compile:** add json-loader ([766d5c4](https://github.com/lc-ui/lcui-cli/commit/766d5c4fccd613d0946bb5188776052411e5378c))
* **compile:** add loaders ([9ba82c7](https://github.com/lc-ui/lcui-cli/commit/9ba82c76cbc841fe4e0ca63c45fe199100b10edb))
* **compile:** add logger ([48dbbf3](https://github.com/lc-ui/lcui-cli/commit/48dbbf3c8347f4241a5af1af8445032fa582fcdf))
* **compile:** add react-tsx compiler ([f71cba9](https://github.com/lc-ui/lcui-cli/commit/f71cba96b2643989bfa462d0299573d80971dd80))
* **compile:** add support for pre rendering React components ([7e71b3a](https://github.com/lc-ui/lcui-cli/commit/7e71b3a410302d39f9434c5c20b574a3f105f2f7))
* **compile:** add ui-loader ([6db68cd](https://github.com/lc-ui/lcui-cli/commit/6db68cd1b386b3523b549688ed36823fd648fef6))
* **compile:** convert resource file url ([6acfde9](https://github.com/lc-ui/lcui-cli/commit/6acfde96f678b4c9ae4d5f590772635036ea7ba4))
* **compile:** file loader did not emit file ([bc2044e](https://github.com/lc-ui/lcui-cli/commit/bc2044ed8619e119ae6071502056eb70ad4f2170))
* **compile:** improving component prototype name selection ([7838bf0](https://github.com/lc-ui/lcui-cli/commit/7838bf0669ecf81654a76085b2f288ad33de75f1))
* **compile:** merge compilers ([5f2d5e4](https://github.com/lc-ui/lcui-cli/commit/5f2d5e42adc208d388f9dee9ad0f526bc2fb9d53))
* **compile:** replace the XML parser and JSON data format ([c067504](https://github.com/lc-ui/lcui-cli/commit/c067504e6e47df1c1d84970b0945f39653859523))
* **compile:** update sass and json compiler ([faf742e](https://github.com/lc-ui/lcui-cli/commit/faf742e51a6630c3bcff1ac6714d8677de66ef0d))
* **compile:** update ts-loader compiler options ([cd6646d](https://github.com/lc-ui/lcui-cli/commit/cd6646d044094d3c683bdfa06030977e1b6c7d59))
* **create:** install node modules ([6409a53](https://github.com/lc-ui/lcui-cli/commit/6409a5302ef2165084661653116534b17d829b4e))
* add resource compiler ([182d08e](https://github.com/lc-ui/lcui-cli/commit/182d08ecf751207534dacccaf288b7624b282938))
* delete i18n compiler and generator ([cda954e](https://github.com/lc-ui/lcui-cli/commit/cda954ec145485627f1a8429070ca67a4bb04adc))
* remove generator ([3abf53a](https://github.com/lc-ui/lcui-cli/commit/3abf53aebabe5b6369a58cc58d60fc01982e6f0c))
* **create:** remove origin remote ([9e4d41a](https://github.com/lc-ui/lcui-cli/commit/9e4d41a021da65449d324d02f77ca65b86429e2c))
* **create:** update command lines ([8ac47d8](https://github.com/lc-ui/lcui-cli/commit/8ac47d89c777dbfb4b87f60ef68191a9ac932778))
* remove makefile generators ([7b060ac](https://github.com/lc-ui/lcui-cli/commit/7b060ac18f508339f874b259671ea360d7cc313a))
* simplify project creation and remove some commands ([995f0b6](https://github.com/lc-ui/lcui-cli/commit/995f0b6b4704e69894dc67ce4a2c8410a2cf4498))


### BREAKING CHANGES

* remove generator
* remove build, run and setup commands
* The 3. x version of LCUI has an i18n library built-in, so the i18n generator and compiler need to be removed.



# [0.4.0](https://github.com/lc-ui/lcui-cli/compare/v0.3.1...v0.4.0) (2021-05-10)


### Bug Fixes

* **generator:** correct the link order of libraries in CMakeLists.txt ([cb8d087](https://github.com/lc-ui/lcui-cli/commit/cb8d087554bbd4ed3503bb4d64816ccd2436f4e2))
* **utils:** add UTF-8 BOM to fix compiler warning C4819 ([9870f9e](https://github.com/lc-ui/lcui-cli/commit/9870f9edf8fb51aa41872f6a0183af3afe91bfb0))
* makefile does not generated before the make tool detection ([9fb615d](https://github.com/lc-ui/lcui-cli/commit/9fb615da3c3429a6b834ed8190dbd2d8fbec223e))


### Features

* add i18n config file generator ([fe4702a](https://github.com/lc-ui/lcui-cli/commit/fe4702a5ba05ed81759ff0796f3db96a5beecd65))
* add setup command ([5d62398](https://github.com/lc-ui/lcui-cli/commit/5d62398f5965a98864dc171dde1aa4fcacb6297e))
* add the arch option for build command ([6423f74](https://github.com/lc-ui/lcui-cli/commit/6423f74bb47fbc891ccd89378ee1acccb4b95be7))
* add the clean option for build command ([845d026](https://github.com/lc-ui/lcui-cli/commit/845d026e68aaca43a4e1b82ebcb45e83e4b19058))
* upgrade dependencies ([621329e](https://github.com/lc-ui/lcui-cli/commit/621329e48807dbeaef6b95b34b89b44ac4d04619))
* **builder:** add sass compiler ([ddd78c4](https://github.com/lc-ui/lcui-cli/commit/ddd78c40e05653a28ab83d3f696eab73de9e4995))



## [0.3.1](https://github.com/lc-ui/lcui-cli/compare/v0.3.0...v0.3.1) (2021-05-06)


### Bug Fixes

* **utils:** format() does not replace key values with dots ([fb80155](https://github.com/lc-ui/lcui-cli/commit/fb801553ab6b3fad74253d8e84468ede5129327c))



# [0.3.0](https://github.com/lc-ui/lcui-cli/compare/v0.2.0...v0.3.0) (2021-01-12)


### Bug Fixes

* husky installation failed ([18b03a9](https://github.com/lc-ui/lcui-cli/commit/18b03a90645eb266bb7a558f93c27a5824cef3fb))


### Features

* add build command ([b705a8e](https://github.com/lc-ui/lcui-cli/commit/b705a8e78821eab6f2f85040c369e4c206b80af3))
* add makefile generator ([0c05220](https://github.com/lc-ui/lcui-cli/commit/0c052200372cb3e1fddba783c9b66629cdfd63d6))
* add run command ([513107c](https://github.com/lc-ui/lcui-cli/commit/513107c8e5b9c4848bcdd0be220bc703639a9a23))



# [0.2.0](https://github.com/lc-ui/lcui-cli/compare/v0.1.0...v0.2.0) (2020-03-02)


### Bug Fixes

* flat() return empty object ([4673792](https://github.com/lc-ui/lcui-cli/commit/4673792))
* variableName transformation incorrect ([f6a4074](https://github.com/lc-ui/lcui-cli/commit/f6a4074))


### Features

* add compiler for compile router config file ([f62f70f](https://github.com/lc-ui/lcui-cli/commit/f62f70f))
* add the sourceDir option to the i18n compiler ([d07b14d](https://github.com/lc-ui/lcui-cli/commit/d07b14d))
* rename 'ci18n' comamnd to 'compile i18n' ([ec0266e](https://github.com/lc-ui/lcui-cli/commit/ec0266e))



