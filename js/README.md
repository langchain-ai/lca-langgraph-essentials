# LangGraph JavaScript/TypeScript Essentials

This directory contains TypeScript implementations of the LangGraph examples from the Python notebooks (L1.ipynb and L2.ipynb). All examples demonstrate the same concepts as the Python versions but leverage TypeScript for type safety and modern JavaScript tooling.

## 🚀 Quick Start

### Prerequisites

- Node.js 22 LTS (minimum 20.16.0 for environment-file loading)
- npm or yarn
- OpenAI API key or configured LangSmith Gateway access (for L2 email workflow)

### Installation

Download the course repository

```bash
# Clone the repo, cd to 'python' directory
git clone https://github.com/langchain-ai/lca-langgraph-essentials.git
cd ./lca-langgraph-essentials/js
```

Make a copy of example.env

```bash
# Create .env file
cp example.env .env
```

For default direct access, add the OpenAI key to `.env`. Alternatively, follow
[Choose model access](../README.md#choose-model-access) to use LangSmith Gateway
without local provider keys for supported chat models.

```bash
# Add OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here

# Optional API key for LangSmith tracing
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=false
LANGSMITH_PROJECT=langgraph-js-essentials
```

build project

```bash
# Install dependencies
pnpm install
```


### Getting Started with LangSmith

- Create a [LangSmith](https://smith.langchain.com/) account
- Create a LangSmith API key
<img width="1196" height="693" alt="Screenshot 2025-10-16 at 8 28 03 AM" src="https://github.com/user-attachments/assets/e39b8364-c3e3-4c75-a287-d9d4685caad5" />
<img width="1196" height="468" alt="Screenshot 2025-10-16 at 8 29 57 AM" src="https://github.com/user-attachments/assets/2e916b2d-e3b0-4c59-a178-c5818604b8fe" />



## 📚 Tutorial Overview

This directory contains TypeScript implementations for Labs 1-5, and an additional email workflow example. These labs cover the foundations of LangGraph that will enable you to build any workflow or agent.

### `L1/` - LangGraph Essentials
TypeScript examples demonstrating all the core components of LangGraph:
- State and Nodes (`01-simple-node.ts`)
- Edges
    - Parallel execution (`02-parallel-execution.ts`)
    - Conditional routing (`03-conditional-edges.ts`, `03-conditional-edge-router.ts`)
- Memory (`04-memory.ts`)
- Interrupts/Human-In-The-Loop (`05-interrupts.ts`)

### `L2/` - Email Workflow
A structured workflow to process customer emails (`email-workflow-complete.ts`). This example utilizes all of the building blocks from L1:
- Task tracking with status management (pending/in_progress/completed)
- Intent classification and routing
- Documentation search and bug tracking
- Human review with interrupts  



## 🎯 Running Examples

### Individual L1 Examples

```bash
pnpm tsx src/L1/01-simple-node.ts
pnpm tsx src/L1/02-parallel-execution.ts
pnpm tsx src/L1/03-conditional-edges.ts 
pnpm tsx src/L1/03-conditional-edge-router.ts
pnpm tsx src/L1/04-memory.ts
pnpm tsx src/L1/05-interrupts.ts 
```
### 📧 L2 Email Workflow

```bash
# email processing in Langsmith Studio
pnpm dev
```

## 🔗 Related Resources

- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
