// L1 Interrupts Example - Human-in-the-loop patterns

import {
  StateGraph,
  START,
  END,
  Command,
  MemorySaver,
  interrupt,
} from '@langchain/langgraph';
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

// Node function with interrupt capability
function nodeA(state: State) {
  console.log("Entered 'a' node");
  const select = state.nlist.at(-1);
  let nextNode: string;

  if (select === 'b') nextNode = 'b';
  else if (select === 'c') nextNode = 'c';
  else if (select === 'q') nextNode = END;
  else {
    // Interrupt for unexpected input
    const admin = interrupt({
      message: `💥 Unexpected input ${select}! Continue? `,
    });
    console.log('Interrupt response:', admin);

    if (admin === 'continue') {
      nextNode = 'b';
    } else {
      nextNode = END;
      // Update select to 'q' to indicate quit
      return new Command({
        update: { nlist: ['q'] },
        goto: nextNode,
      });
    }
  }

  return new Command({
    update: {},
    goto: nextNode,
  });
}

function nodeB(state: State) {
  return { nlist: ['B'] };
}

function nodeC(state: State) {
  return { nlist: ['C'] };
}

// Add in-memory persistence
const memory = new MemorySaver();

export const graph = new StateGraph(StateDefinition)
  // Add all nodes
  .addNode('a', nodeA, { ends: ['b', 'c'] })
  .addNode('b', nodeB)
  .addNode('c', nodeC)
  // Add edges to create parallel execution paths
  .addEdge(START, 'a')
  .addEdge('b', END)
  .addEdge('c', END)
  // Finally, compile the graph
  .compile({ checkpointer: memory });

// Check if result contains an interrupt
function hasInterrupt(result: any): result is { __interrupt__: any[] } {
  return result && result.__interrupt__ && Array.isArray(result.__interrupt__);
}

// Example usage with interrupt handling
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('\n=== L1: Interrupts Example ===\n');

  console.log(
    'This example demonstrates human-in-the-loop patterns with interrupts.'
  );

  while (true) {
    const threadId = await getUserInput('Enter thread ID, or q to quit: ');

    if (threadId === 'q') {
      console.log('Quitting...');
      break;
    }

    const config = {
      configurable: { thread_id: threadId },
    };

    console.log(`=== Thread '${threadId}' Operations ===`);

    while (true) {
      console.log(
        'Enter "b" to go to node B, "c" to go to node C, or "q" to quit.\n'
      );
      console.log(
        'Try entering unexpected input (not "b", "c", or "q") to trigger an interrupt.\n'
      );

      const input = await getUserInput('b, c, or q to quit: ');
      const inputState: State = {
        nlist: [input],
      };

      let result = await graph.invoke(inputState, config);

      // Check if an interrupt occurred
      if (hasInterrupt(result)) {
        console.log(`${'-'.repeat(80)}`);
        console.log('Interrupt:', result);

        const interruptMessage = result.__interrupt__.at(-1);
        const msg = interruptMessage.value?.message || 'Continue?';
        const human = await getUserInput(`\n${msg}: `);

        // Resume with human response
        result = await graph.invoke(new Command({ resume: human }), config);
        console.log(`${'-'.repeat(80)}`);
      }

      console.log(`Thread '${threadId}' after '${input}':`, result);

      if (result.nlist.at(-1) === 'q') {
        console.log('Exitting thread...');
        break;
      }
    }
  }

  console.log('\n=== Takeaways ===');
  console.log(
    '- interrupt() statement pauses operation and returns value in __interrupt__ field'
  );
  console.log(
    '- When graph is invoked with Command containing resume, operation continues'
  );
  console.log('- Node is restarted from the beginning');
  console.log('- Checkpointer replays responses to interrupts');
  console.log(
    '- Enables human oversight and intervention in automated workflows\n'
  );
}
