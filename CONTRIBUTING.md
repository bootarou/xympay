# Contributing to XYMPay

Thank you for your interest in contributing to XYMPay! We welcome contributions from the community.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/xympay.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature-name`
8. Submit a pull request

## 📋 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### Setup Steps
```bash
# Clone the repository
git clone https://github.com/yourusername/xympay.git
cd xympay

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

## 🧪 Testing

Before submitting a pull request, please ensure:

1. **Linting passes**: `npm run lint`
2. **TypeScript compiles**: `npx tsc --noEmit`
3. **Application builds**: `npm run build`
4. **Test scripts work**: Run relevant test scripts in `test-scripts/`

## 📝 Code Style

- Use TypeScript for all new code
- Follow existing code style and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## 🔒 Security Guidelines

- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate all user inputs
- Follow security best practices

## 📖 Documentation

- Update README.md if needed
- Add comments to complex code
- Update API documentation if creating new endpoints
- Include examples for new features

## 🐛 Bug Reports

When filing a bug report, please include:

- **Environment**: OS, Node.js version, etc.
- **Steps to reproduce**: Clear steps to reproduce the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Screenshots**: If applicable

## 💡 Feature Requests

For feature requests, please:

- Check existing issues first
- Provide clear use case and benefits
- Include mockups or examples if applicable
- Be open to discussion and feedback

## 🔍 Code Review Process

1. All submissions require review
2. Maintainers will review your code
3. Address any feedback promptly
4. Once approved, your code will be merged

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Community

- Be respectful and inclusive
- Follow the code of conduct
- Help others when possible
- Ask questions if unsure

## 📞 Contact

If you have questions about contributing:

- Open an issue for discussion
- Contact maintainers via GitHub
- Join our community Discord (if available)

Thank you for contributing to XYMPay! 🎉
