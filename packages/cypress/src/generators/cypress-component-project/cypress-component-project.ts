import { CypressComponentProjectSchema } from './schema';
import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { join } from 'path';
import {
  cypressReactVersion,
  cypressVersion,
  cypressWebpackVersion,
  swcCoreVersion,
  swcLoaderVersion,
  webpackHttpPluginVersion,
} from '../../utils/versions';
import { installedCypressVersion } from '../../utils/cypress-version';
import { CYPRESS_COMPONENT_TEST_TARGET_NAME } from '../../utils/project-name';

/**
 * Check the installed version of cypress.
 * @returns true if cypress should be installed or false if cypress doesn't need to be installed, i.e. already installed or higher version is installed
 * @throws Error if this installed cypress version is not supported.
 * @throws Error if the force flag is not supplied AND either cypress.config.ts or cypress component test target already exists
 */
export function checkInstalledCypress(
  tree: Tree,
  options: CypressComponentProjectSchema,
  projectConfig: ProjectConfiguration
): boolean {
  // if the project already has the component testing target or a cypress.config.ts file then we make sure the --force flag is sent. if not, we throw an error.
  if (
    projectConfig.targets?.[CYPRESS_COMPONENT_TEST_TARGET_NAME] ||
    tree.exists(joinPathFragments(projectConfig.root, 'cypress.config.ts'))
  ) {
    if (!options.force) {
      throw new Error(
        `The project already has a cypress component testing target. Please use the --force flag to overwrite the existing project.`
      );
    }
    return true;
  }

  const installedVersion = installedCypressVersion();
  // if we don't have a version then it's safe to install cypress
  if (!installedVersion) {
    return true;
  }

  if (installedVersion >= 10) {
    return false;
  }

  throw new Error('Cypress version 10 or greater is required ');
}

function updateDeps(
  tree: Tree,
  options: CypressComponentProjectSchema,
  shouldInstallCypress: boolean
) {
  const devDeps = {
    '@cypress/webpack-dev-server': cypressWebpackVersion,
    'html-webpack-plugin': webpackHttpPluginVersion,
  };

  if (shouldInstallCypress) {
    devDeps['cypress'] = cypressVersion;
  }

  if (options.componentType === 'react' || options.componentType === 'next') {
    devDeps['@cypress/react'] = cypressReactVersion;
    if (options.compiler === 'swc') {
      devDeps['@swc/core'] = swcCoreVersion;
      devDeps['swc-loader'] = swcLoaderVersion;
    }
  }
  return addDependenciesToPackageJson(tree, {}, devDeps);
}

function addFiles(
  tree: Tree,
  projectConfig: ProjectConfiguration,
  options: CypressComponentProjectSchema
) {
  generateFiles(tree, join(__dirname, 'files'), projectConfig.root, {
    ...options,
    projectRoot: projectConfig.root,
    offsetFromRoot: offsetFromRoot(projectConfig.root),
    ext: '',
  });
}

function addTargetToProject(
  projectConfig: ProjectConfiguration,
  tree: Tree,
  options: CypressComponentProjectSchema
) {
  projectConfig.targets[CYPRESS_COMPONENT_TEST_TARGET_NAME] = {
    executor: '@nrwl/cypress:cypress',
    options: {
      cypressConfig: joinPathFragments(projectConfig.root, 'cypress.config.ts'),
      testingType: 'component',
    },
  };

  updateProjectConfiguration(tree, options.project, projectConfig);
}

export async function cypressComponentProject(
  tree: Tree,
  options: CypressComponentProjectSchema
) {
  const projectConfig = readProjectConfiguration(tree, options.project);

  const shouldInstallCypress = checkInstalledCypress(
    tree,
    options,
    projectConfig
  );

  addFiles(tree, projectConfig, options);

  updateTSConfig(tree, projectConfig);

  addTargetToProject(projectConfig, tree, options);

  const installDeps = updateDeps(tree, options, shouldInstallCypress);

  return () => {
    formatFiles(tree);
    installDeps();
  };
}

// TODO(caleb):is this actually needed?
//  it _seems_ to be fine without a tsconfig??
function updateTSConfig(tree: Tree, projectConfig: ProjectConfiguration) {
  const projectTsConfigPath = joinPathFragments(
    projectConfig.root,
    'tsconfig.json'
  );
  if (!tree.exists(projectTsConfigPath)) {
    throw new Error(
      `Expected project tsconfig.json to exist. Please create one. Expected ${projectTsConfigPath} to exist. Found none.`
    );
  }
  updateJson(tree, projectTsConfigPath, (json) => {
    json.references = json.references || [];
    json.references.push({ path: './tsconfig.cy.json' });
    return json;
  });
}
