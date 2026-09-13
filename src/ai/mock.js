function section(heading, paragraphs, bullets = []) {
  return { heading, paragraphs, bullets };
}

function inferName(project, scan) {
  if (project.packageName) return project.packageName.replace(/^@[^/]+\//, '');
  const readme = scan.documents.find((doc) => /readme\.md$/i.test(doc.path));
  const match = readme?.content.match(/^#\s+(.+)$/m);
  return match?.[1].trim() || 'This Service';
}

export function createMockResponse({ project, scan, country, date }) {
  const name = inferName(project, scan);
  const operator = `the operator of ${name}`;
  return {
    projectName: name,
    summary: `${name} is the software service described in the project's supplied documentation.`,
    privacyPolicy: {
      title: 'Privacy Policy',
      lastUpdated: date,
      intro: [
        `This Privacy Policy explains how ${operator} (\"we\", \"us\", or \"our\") handles information when you use ${name}. It is a draft generated from the available project documentation and should be reviewed by the operator before publication.`,
        `This policy is intended for users in ${country}. If you use the service from another location, additional local rights may apply.`
      ],
      sections: [
        section('Information We Handle', [
          'We may handle information you provide directly, such as account, profile, support, or form details, when those features are available. We may also receive limited technical information needed to operate and protect the service, such as device, browser, log, and diagnostic data.',
          'The exact information collected depends on the features you choose to use. We do not intend to collect information that is not reasonably required for those features.'
        ]),
        section('How We Use Information', ['We use information only for legitimate service purposes, including:'], [
          'providing, maintaining, and improving the service;',
          'responding to requests and communicating about the service;',
          'protecting users, preventing abuse, and troubleshooting problems;',
          'meeting applicable legal and regulatory obligations.'
        ]),
        section('Consent and Lawful Handling', [`Where ${country} law requires consent, we will request clear consent before handling personal data and allow it to be withdrawn. In other cases, we handle data when necessary to provide the requested service, comply with law, or pursue a legitimate purpose permitted by law.`]),
        section('Cookies and Similar Technologies', ['The service may use essential browser storage or similar technologies to maintain sessions, preferences, and security. Any non-essential analytics or advertising technology should be disclosed and, where required, enabled only after consent.']),
        section('Service Providers and Disclosures', ['We may share information with vendors that host, secure, support, or otherwise process data for the service under appropriate instructions. We may also disclose information when legally required, to protect rights and safety, or as part of a business transfer. We do not authorize service providers to use personal data for unrelated purposes.']),
        section('International Processing', [`Information may be processed outside your state or country where our infrastructure or service providers operate. When required by the laws of ${country}, we use appropriate safeguards for such transfers.`]),
        section('Data Retention', ['We retain personal data only for as long as needed for the purposes described here, including providing the service, resolving disputes, maintaining security, and complying with law. Retention periods vary according to the type of information and the reason it is held.']),
        section('Security', ['We use reasonable administrative, technical, and organizational safeguards appropriate to the service. No method of storage or transmission is completely secure, so absolute security cannot be guaranteed.']),
        section('Your Choices and Rights', [`Depending on applicable law in ${country}, you may be able to access, correct, update, erase, or obtain information about your personal data; withdraw consent; object to certain handling; or raise a grievance. Requests can be made using the contact method published with the service. We may need to verify your identity.`]),
        section("Children's Privacy", ['The service is not directed to children unless the product documentation expressly says otherwise. If we learn that personal data of a child was collected without authorization required by applicable law, we will take reasonable steps to remove it.']),
        section('Changes to This Policy', ['We may update this policy as the service or applicable requirements change. The revised version will show a new effective date, and material changes may be communicated through the service or another appropriate channel.']),
        section('Contact and Grievances', [`Questions, privacy requests, and grievances should be sent through the contact channel published by ${operator}. The operator should add a working email or postal address here before releasing this page.`])
      ]
    },
    termsOfUse: {
      title: 'Terms of Use',
      lastUpdated: date,
      intro: [
        `These Terms of Use govern access to and use of ${name}. By using the service, you agree to these terms. If you do not agree, do not use the service.`,
        'These terms are a generated draft and should be reviewed and completed by the operator before publication.'
      ],
      sections: [
        section('Eligibility and Authority', ['You must be legally capable of entering into these terms. If you use the service for an organization, you confirm that you have authority to bind that organization. Additional age or guardian requirements under applicable law continue to apply.']),
        section('The Service', [`${name} provides the functionality described through its product interface and documentation. Features may evolve, and we may change, suspend, or discontinue parts of the service where reasonably necessary.`]),
        section('Accounts and Security', ['If an account is required, provide accurate information, protect your credentials, and promptly report suspected unauthorized use. You are responsible for activity under your account to the extent permitted by law.']),
        section('Acceptable Use', ['You may not misuse the service. In particular, you must not:'], [
          'violate law or the rights of another person;',
          'upload malicious code or interfere with service security or availability;',
          'attempt unauthorized access, scraping, reverse engineering, or circumvention of safeguards except where law expressly permits it;',
          'use the service to distribute deceptive, abusive, or unlawful material.'
        ]),
        section('Your Content', ['You retain ownership of content you submit. You grant us only the limited rights needed to host, process, display, and transmit that content to operate the service. You confirm that you have the rights needed to submit it and that it does not violate law or third-party rights.']),
        section('Our Intellectual Property', [`The service, software, branding, and operator-provided content are owned by ${operator} or its licensors and are protected by applicable intellectual-property laws. These terms grant only a limited, revocable, non-transferable right to use the service as intended.`]),
        section('Third-Party Services', ['The service may link to or depend on third-party products. Their terms and privacy practices apply to their services, and we are not responsible for third-party content or availability except where applicable law provides otherwise.']),
        section('Disclaimers', ['To the extent permitted by law, the service is provided on an “as is” and “as available” basis. We do not promise uninterrupted or error-free operation. Nothing in these terms excludes warranties or consumer rights that cannot legally be excluded.']),
        section('Limitation of Liability', ['To the maximum extent permitted by law, the operator will not be liable for indirect, incidental, special, consequential, or punitive losses arising from the service. Any enforceable limitation must be applied consistently with mandatory consumer and other applicable laws.']),
        section('Suspension and Termination', ['We may restrict or end access for a material violation of these terms, risk to users or the service, legal requirements, or discontinuation. You may stop using the service at any time. Provisions that by their nature should survive termination will remain effective.']),
        section('Governing Law and Disputes', [`These terms are governed by the applicable laws of ${country}, without overriding mandatory protections available to you. The operator should specify its state, courts, and any required dispute process before publication.`]),
        section('Changes to These Terms', ['We may update these terms when the service or legal requirements change. We will post the revised terms with a new effective date and provide additional notice where required. Continued use after the effective date constitutes acceptance only to the extent permitted by law.']),
        section('Contact', [`Questions about these terms should be sent through the contact channel published by ${operator}. The operator should add complete legal identity and contact details before releasing this page.`])
      ]
    }
  };
}
