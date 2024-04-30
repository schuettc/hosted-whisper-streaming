import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone, HostedZone } from 'aws-cdk-lib/aws-route53';

import { Construct } from 'constructs';

interface CertificateResourceProps {
  domainName: string;
}
export class CertificateResources extends Construct {
  public readonly certificate: Certificate;
  public readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: CertificateResourceProps) {
    super(scope, id);

    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
    });

    this.certificate = new Certificate(this, 'Certificate', {
      domainName: `whisper.${props.domainName}`,
      validation: CertificateValidation.fromDns(this.hostedZone),
    });
  }
}
