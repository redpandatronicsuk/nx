import { Configuration } from 'webpack';
// TODO(caleb): do we need this?
//  if we support next apps then _yes_ but isn't really recommend
//  for an "app" to be component testing. should be libs only?
import { startDevServer } from '@cypress/webpack-dev-server';
import { resolve } from 'path';
import {
  buildBaseWebpackConfig,
  CSS_MODULES_LOADER,
  getLibLoaders,
} from '@nrwl/cypress/plugins/utils/webpack';

const findNextWebpackConfig = require('@cypress/react/plugins/next/findNextWebpackConfig');

export function componentDevServer(
  tsConfigPath = 'tsconfig.cy.json',
  compiler: 'swc' | 'babel' = 'babel',
  extendWebPackConfig?: (config: Configuration) => Configuration
) {
  return async (cypressConfigOptions) => {
    let webpackConfig: Configuration = await findNextWebpackConfig(
      cypressConfigOptions.config
    );

    if (!webpackConfig) {
      throw new Error(
        'Could not find a webpack config for next. is @nrwl/next installed?'
      );
    }

    // TODO(caleb): Technically this works, but pretty sure it's wrong 🙃
    //  without this it _works_ until you load in another lib
    //  and it doesn't know how to build it.
    //  i.e. won't read babelrc for the imported lib.
    const babelLoader = getLibLoaders(compiler, 'next');

    // TODO(caleb): unable to call page specific stuff as expected... 🤔
    //   get function isn't defined.
    //  cy.wrap(getStaticProps())
    //         .then(({props}: any) => mount(<SomeComponent {...props}/>))
    //  asking cypress team if this is still supported in v10.
    //  I assume it is/should still work 🤔
    webpackConfig.module.rules.push(babelLoader);
    // TODO(caleb): issues with css module not loading
    webpackConfig.module.rules.push(CSS_MODULES_LOADER);

    if (extendWebPackConfig) {
      webpackConfig = extendWebPackConfig(webpackConfig);
    }

    const { startDevServer } = require('@cypress/webpack-dev-server');

    return startDevServer({
      options: cypressConfigOptions,
      webpackConfig,
      template: resolve(__dirname, 'next.template.html'),
    });
  };
}
