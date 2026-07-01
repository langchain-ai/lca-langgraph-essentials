// L1 Parallel Execution Example - Parallel edges and state merging

import { StateGraph, START, END } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { fileURLToPath } from 'url';
import z from 'zod';

const StateDefinition = z.object({
  nlist: z.array(z.string()).register(registry, {
    reducer: {
      fn: (left: string[], right: string[]) => left.concat(right),
    },
    default: () => [],
  }),
});

type State = z.infer<typeof StateDefinition>;

function nodeA(state: State) {
  console.log(`Adding "A" to`, state.nlist);
  return { nlist: ['A'] };
}

function nodeB(state: State) {
  console.log(`Adding "B" to`, state.nlist);
  return { nlist: ['B'] };
}

function nodeBB(state: State) {
  console.log(`Adding "BB" to`, state.nlist);
  return { nlist: ['BB'] };
}

function nodeC(state: State) {
  console.log(`Adding "C" to`, state.nlist);
  return { nlist: ['C'] };
}

function nodeCC(state: State) {
  console.log(`Adding "CC" to`, state.nlist);
  return { nlist: ['CC'] };
}

function nodeD(state: State) {
  console.log(`Adding "D" to`, state.nlist);
  return { nlist: ['D'] };
}

export const graph = new StateGraph(StateDefinition)
  // Add all nodes
  .addNode('a', nodeA)
  .addNode('b', nodeB)
  .addNode('bb', nodeBB)
  .addNode('c', nodeC)
  .addNode('cc', nodeCC)
  .addNode('d', nodeD)
  // Add edges to create parallel execution paths
  .addEdge(START, 'a')
  .addEdge('a', 'b')
  .addEdge('a', 'c')
  .addEdge('b', 'bb')
  .addEdge('c', 'cc')
  .addEdge('bb', 'd')
  .addEdge('cc', 'd')
  .addEdge('d', END)
  // Finally, compile the graph
  .compile();

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('\n=== L1: Parallel Execution Example ===\n');

  // Run the graph with initial state
  const initialState: State = {
    nlist: ['Initial String:'],
  };

  console.log('Running graph with initial state:', initialState);
  const result = await graph.invoke(initialState);
  console.log('Final result:', result);

  console.log('\n=== Takeaways ===');
  console.log(
    '- State passed to nodes "bb" and "cc" is the result of both "b" and "c"'
  );
  console.log('- Edges convey control, not data');
  console.log('- Data is stored to state from all active nodes at end of step');
  console.log('- Nodes b and c operate in parallel');
  console.log('- Reducer function merges values returned');
  console.log('- Results from nodes b, c are stored before starting bb and cc');
  console.log('- Control follows edges, not data\n');
}
