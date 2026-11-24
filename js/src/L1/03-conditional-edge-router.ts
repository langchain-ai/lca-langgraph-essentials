// L1 Conditional Edges Example - Command-based routing

import { StateGraph, START, END } from '@langchain/langgraph';
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

// Alternative implementation using addConditionalEdges
function nodeA(state: State): Partial<State> {
  const select = state.nlist.at(-1) ?? ''; // Get last element
  return { nlist: [select] };
}

function nodeB(state: State): Partial<State> {
  return { nlist: ['B'] };
}

function nodeC(state: State): Partial<State> {
  return { nlist: ['C'] };
}

function routeFromA(state: State): string {
  const select = state.nlist.at(-1); // Get last element

  if (select === 'b') return 'b';
  else if (select === 'c') return 'c';
  else if (select === 'q') return END;
  else return END;
}

export const graphWithConditionalEdges = new StateGraph(StateDefinition)
  // Add all nodes
  .addNode('a', nodeA)
  .addNode('b', nodeB)
  .addNode('c', nodeC)
  // Add edges
  .addEdge(START, 'a')
  .addConditionalEdges('a', routeFromA)
  .addEdge('b', END)
  .addEdge('c', END)
  // Finally, compile the graph
  .compile();

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('\n=== L1: Conditional Edge Router Example ===\n');

  console.log(
    'This example demonstrates conditional routing using addConditionalEdges.'
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
  const result = await graphWithConditionalEdges.invoke(inputState);
  console.log('Result:', result);

  console.log('\n=== Takeaways ===');
  console.log('- addConditionalEdges separates routing logic from node logic');
  console.log('- Router function receives state and returns next node name');
  console.log('- Node function only updates state, not control flow');
  console.log('- Cleaner separation of concerns compared to Command approach');
  console.log(
    '- Router function must return one of the specified destinations\n'
  );
}
