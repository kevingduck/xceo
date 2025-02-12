git clone https://github.com/yourusername/xceo.git
cd xceo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your database and Anthropic API credentials
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork & Clone**: Start by forking this repository and cloning your fork

2. **Branch**: Create a feature branch
```bash
git checkout -b feature/amazing-feature
```

3. **Develop**: Make your changes following our coding standards:
   - Use TypeScript for type safety
   - Follow the existing project structure
   - Add tests for new features
   - Ensure mobile responsiveness
   - Keep AI interactions user-centric

4. **Test**: Ensure all tests pass
```bash
npm run test