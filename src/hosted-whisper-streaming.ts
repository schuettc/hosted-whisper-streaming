import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { config } from 'dotenv';
import { ECSResources, VPCResources, CertificateResources } from '.';
config();

interface HostedWhisperStreamingProps extends StackProps {
  logLevel: string;
  domainName: string;
  model: string;
}

export class HostedWhisperStreaming extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: HostedWhisperStreamingProps,
  ) {
    super(scope, id, props);

    if (!props.domainName) {
      throw new Error('Domain Name is required');
    }

    if (props.model) {
      if (
        ![
          'tiny',
          'base',
          'small',
          'medium',
          'large',
          'tiny.en',
          'base.en',
          'small.en',
          'large.en',
        ].includes(props.model)
      ) {
        throw new Error('Invalid model');
      }
    }

    const certificateResources = new CertificateResources(
      this,
      'CertificateResources',
      {
        domainName: props.domainName,
      },
    );
    const vpcResources = new VPCResources(this, 'VPCResources');
    new ECSResources(this, 'ECSResources', {
      vpc: vpcResources.vpc,
      loadBalancerSecurityGroup: vpcResources.loadBalancerSecurityGroup,
      logLevel: props.logLevel,
      certificate: certificateResources.certificate,
      hostedZone: certificateResources.hostedZone,
      model: props.model,
    });

    new CfnOutput(this, 'target', {
      value: `whisper.${props.domainName}`,
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const stackProps = {
  logLevel: process.env.LOG_LEVEL || 'INFO',
  model: process.env.MODEL || 'base',
  domainName: process.env.DOMAIN_NAME || '',
};

const app = new App();

new HostedWhisperStreaming(app, 'HostedWhisperStreaming', {
  ...stackProps,
  env: devEnv,
});

app.synth();
