// L1 Conditional Edges Example - Command-based routing

import { StateGraph, Command, START, END } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { fileURLToPath } from 'url';
import z from 'zod';
import { getUserInput } from '../utils.js';

const StateDefinition = z.object({
  nlist: z.array(z.string()).register(registry, {
    reducer: {
      fn: (left: string[], right: string[]) => left.concat(right),
    },
    default: () => [],
  }),
});

type State = z.infer<typeof StateDefinition>;

// Node functions with conditional routing
function nodeA(state: State): Command {
  const select = state.nlist.at(-1); // Get last element
  let nextNode: string;

  if (select === 'b') nextNode = 'b';
  else if (select === 'c') nextNode = 'c';
  else if (select === 'q') nextNode = END;
  else nextNode = END;

  return new Command({
    update: { nlist: [select] },
    goto: nextNode,
  });
}

function nodeB(state: State): Partial<State> {
  return { nlist: ['B'] };
}

function nodeC(state: State): Partial<State> {
  return { nlist: ['C'] };
}

export const graph = new StateGraph(StateDefinition)
  // Add all nodes
  .addNode('a', nodeA, { ends: ['b', 'c'] })
  .addNode('b', nodeB)
  .addNode('c', nodeC)
  // Add edges to create conditional execution paths
  // (notice how there isn't an edge from 'a' to 'b' or 'c')
  .addEdge(START, 'a')
  .addEdge('b', END)
  .addEdge('c', END)
  // Finally, compile the graph
  .compile();

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('\n=== L1: Conditional Edges Example ===\n');

  console.log(
    'This example demonstrates conditional routing based on user input.'
  );
  console.log(
    'Enter "b" to go to node B, "c" to go to node C, or "q" to quit.\n'
  );

  // Single example run
  const user = await getUserInput('b, c, or q to quit: ');

  const inputState: State = {
    nlist: [user],
  };

  console.log(`Running graph with input: "${user}"`);
  const result = await graph.invoke(inputState);
  console.log('Result:', result);

  console.log('\n=== Takeaways ===');
  console.log(
    '- Command in return statement updates both state and control path'
  );
  console.log('- Command "goto" allows you to name the next node');
  console.log('- Must be careful to match destination node name');
  console.log('- Return type annotation helps with type checking');
  console.log('- Conditional logic determines the execution path\n');
}
