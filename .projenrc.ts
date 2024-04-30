const { awscdk } = require('projen');
const { JobPermission } = require('projen/lib/github/workflows-model');
const { UpgradeDependenciesSchedule } = require('projen/lib/javascript');
const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.118.0',
  license: 'MIT-0',
  author: 'Court Schuett',
  copyrightOwner: 'Court Schuett',
  authorAddress: 'https://subaud.io',
  appEntrypoint: 'hosted-whisper-streaming.ts',
  jest: false,
  projenrcTs: true,
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      schedule: UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['schuettc'],
  },
  autoApproveUpgrades: true,
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  defaultReleaseBranch: 'main',
  name: 'hosted-whisper-streaming',
  deps: ['dotenv'],
});

project.addTask('launch', {
  exec: 'yarn cdk deploy --require-approval never && yarn writeDistributionDomain',
});

project.addTask('getDistributionDomain', {
  exec: "aws cloudformation describe-stacks --stack-name HostedWhisperStreaming --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`target`].OutputValue' --output text",
});

project.addTask('writeDistributionDomain', {
  exec: 'echo TARGET=$(yarn run --silent getDistributionDomain) > ./client/.env && echo PORT=50051 >> ./client/.env',
});

project.tsconfigDev.file.addOverride('include', [
  'src/**/*.ts',
  'client/*.ts',
  './.projenrc.ts',
]);

project.eslint.addOverride({
  files: ['src/resources/**/*.ts'],
  rules: {
    'indent': 'off',
    '@typescript-eslint/indent': 'off',
  },
});

const common_exclude = [
  'docker-compose.yaml',
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
  '.DS_Store',
  '.env',
  '**/dist/**',
  '**/bin/**',
  '**/lib/**',
  'config.json',
];

project.gitignore.exclude(...common_exclude);
project.synth();
