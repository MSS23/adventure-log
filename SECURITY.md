# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

1. **DO NOT** open a public issue
2. Email security details to: security@adventurelog.app
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** 90 days for responsible disclosure

### Disclosure Policy

- We follow a 90-day disclosure timeline
- Security advisories will be published after fix deployment
- Credit will be given to reporters (unless anonymity is requested)

### Security Best Practices

For users and developers:
- Keep dependencies updated
- Use strong passwords and enable 2FA
- Review code before deployment
- Follow security guidelines in CONTRIBUTING.md

## Known Security Considerations

- Environment variables must be kept secret
- Database RLS policies should be reviewed regularly
- Rate limiting is enforced on all API endpoints
- Input validation is required for all user inputs

## Security Documentation

For detailed security documentation including vulnerability details and remediation steps, see [docs/SECURITY.md](./docs/SECURITY.md).
