import {
  addProjectConfiguration,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { installedCypressVersion } from '../../utils/cypress-version';

import {
  CYPRESS_COMPONENT_TEST_TARGET_NAME,
  cypressComponentProject,
} from '@nrwl/cypress';
import { checkInstalledCypress } from './cypress-component-project';

jest.mock('../../utils/cypress-version');
let projectConfig: ProjectConfiguration = {
  projectType: 'library',
  sourceRoot: 'libs/cool-lib/src',
  root: 'libs/cool-lib',
  targets: {
    test: {
      executor: '@nrwl/jest:jest',
      options: {
        jestConfig: 'libs/cool-lib/jest.config.js',
      },
    },
  },
};
describe('Cypress Component Project', () => {
  let tree: Tree;
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as never;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'cool-lib', projectConfig);
    tree.write(
      'libs/cool-lib/tsconfig.json',
      `
{
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
}
`
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('should be able to create project with cypress 10 installed', () => {
      mockedInstalledCypressVersion.mockReturnValue(10);
      const actual = checkInstalledCypress(
        tree,
        {
          project: 'cool-lib',
          compiler: 'babel',
          componentType: 'react',
          force: false,
        },
        projectConfig
      );
      expect(actual).toEqual(false);
    });

    it('should not be able to create project with < cypress v9 installed', () => {
      mockedInstalledCypressVersion.mockReturnValue(9);

      expect(() =>
        checkInstalledCypress(
          tree,
          {
            project: 'cool-lib',
            compiler: 'swc',
            componentType: 'react',
            force: false,
          },
          projectConfig
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('should throw an error if cypress project is already created', () => {
      mockedInstalledCypressVersion.mockReturnValue(9);
      tree.write('libs/cool-lib/cypress.config.ts', '');
      expect(() =>
        checkInstalledCypress(
          tree,
          {
            project: 'cool-lib',
            compiler: 'swc',
            componentType: 'react',
            force: false,
          },
          projectConfig
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('should create cypress project over existing with --force', () => {
      mockedInstalledCypressVersion.mockReturnValue(9);
      tree.write('libs/cool-lib/cypress.config.ts', '');
      const newTarget = {
        [CYPRESS_COMPONENT_TEST_TARGET_NAME]: {
          executor: '@nrwl/cypress:cypress',
          options: {
            cypressConfig: 'libs/cool-lib/cypress.config.ts',
            testingType: 'component',
          },
        },
      };
      updateProjectConfiguration(tree, 'cool-lib', {
        ...projectConfig,
        targets: {
          ...projectConfig.targets,
          ...newTarget,
        },
      });

      const actual = checkInstalledCypress(
        tree,
        {
          project: 'cool-lib',
          compiler: 'swc',
          componentType: 'react',
          force: true,
        },
        projectConfig
      );
      expect(actual).toEqual(true);
    });
  });

  describe('react', () => {
    beforeEach(() => {
      mockedInstalledCypressVersion.mockReturnValue(10);
    });
    it('should create project w/babel', async () => {
      tree.delete('libs/cool-lib/cypress.config.ts');
      await cypressComponentProject(tree, {
        project: 'cool-lib',
        compiler: 'babel',
        componentType: 'react',
        force: false,
      });
      const actualProjectConfig = readProjectConfiguration(tree, 'cool-lib');

      expect(tree.exists('libs/cool-lib/cypress.config.ts')).toEqual(true);
      expect(tree.exists('libs/cool-lib/cypress')).toEqual(true);
      expect(tree.exists('libs/cool-lib/tsconfig.cy.json')).toEqual(true);
      expect(actualProjectConfig.targets['test-cmp']).toMatchSnapshot();
    });

    it('should create project w/swc', async () => {
      tree.delete('libs/cool-lib/cypress.config.ts');
      await cypressComponentProject(tree, {
        project: 'cool-lib',
        compiler: 'swc',
        componentType: 'react',
        force: false,
      });

      const actualProjectConfig = readProjectConfiguration(tree, 'cool-lib');

      expect(tree.exists('libs/cool-lib/cypress.config.ts')).toEqual(true);
      expect(tree.exists('libs/cool-lib/cypress')).toEqual(true);
      expect(tree.exists('libs/cool-lib/tsconfig.cy.json')).toEqual(true);
      expect(actualProjectConfig.targets['test-cmp']).toMatchSnapshot();
    });
  });
});
