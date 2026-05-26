// L2 Email Workflow - Complete email processing workflow

import {
  StateGraph,
  START,
  END,
  Command,
  MemorySaver,
  interrupt,
} from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { generateId } from '../utils.js';
import z from 'zod';

const llm = new ChatOpenAI({
  model: 'gpt-5-nano',
});

// You can use Google Gemini as your llm

// const llm = new ChatGoogleGenerativeAI({
//   model: 'gemini-2.0-flash',
//   apiKey: process.env.GEMINI_API_KEY,
// });

export const EmailClassificationSchema = z.object({
  intent: z.enum(['question', 'bug', 'billing', 'feature', 'complex']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  topic: z.string(),
  summary: z.string(),
});

export const EmailStateDefinition = z.object({
  emailContent: z.string(),
  senderEmail: z.string(),
  emailId: z.string(),
  classification: EmailClassificationSchema.optional(),
  ticketId: z.string().optional(),
  searchResults: z.array(z.string()).optional(),
  customerHistory: z.record(z.string(), z.any()).optional(),
  draftResponse: z.string().optional(),
});

export type EmailAgentState = z.infer<typeof EmailStateDefinition>;

/**
 * Read and process incoming email
 *
 * This node serves as the entry point for the email workflow. In production,
 * this would connect to your email service (e.g., Gmail API, Exchange, IMAP)
 * to fetch email content. Currently, it acts as a pass-through node that logs
 * the sender information.
 *
 * @param state - The current email agent state containing sender_email and email_content
 * @returns Empty partial state (passes through unchanged)
 *
 * @remarks
 * The email_content is expected to be passed in when the graph is initially invoked.
 * This function primarily serves to log the processing start and could be extended
 * to perform email validation, spam filtering, or other preprocessing tasks.
 *
 * @example
 * ```typescript
 * const result = readEmail({
 *   email_content: "Hello, I need help with...",
 *   sender_email: "customer@example.com"
 * });
 * // Logs: "Processing email from: customer@example.com"
 * // Returns: {}
 * ```
 */
function readEmail(state: EmailAgentState) {
  // In production, this would connect to your email service
  // email_content is being passed in when the graph is invoked
  console.log(`Processing email from: ${state.senderEmail}`);
  return {}; // Pass through state unchanged
}

/**
 * Classify email intent and urgency using AI
 *
 * Analyzes the email content and sender information to determine:
 * - Intent: The purpose of the email (question, bug, billing, feature, complex)
 * - Urgency: The priority level (low, medium, high, critical)
 * - Topic: The main subject matter
 * - Summary: A brief description of the email content
 *
 * @param state - The current email agent state containing email_content and sender_email
 * @returns Partial state update with classification results, or fallback classification on error
 *
 * @example
 * ```typescript
 * const result = await classifyIntent({
 *   email_content: "Our production system is down!",
 *   sender_email: "customer@example.com"
 * });
 * // Returns: { classification: { intent: 'bug', urgency: 'critical', ... } }
 * ```
 */
async function classifyIntent(state: EmailAgentState) {
  console.log('Classifying email intent and urgency...');

  // Create structured LLM that returns EmailClassification
  const structuredLlm = llm.withStructuredOutput(EmailClassificationSchema);

  // Format the prompt on-demand
  const classificationPrompt = `
Analyze this customer email and classify it:

Email: ${state.emailContent}
From: ${state.senderEmail}

Provide classification, including intent, urgency, topic, and summary.
  `;

  try {
    // Get structured response directly as object
    const classification = await structuredLlm.invoke(classificationPrompt);
    console.log('Classification:', classification);

    return { classification };
  } catch (error) {
    console.error('Error classifying email:', error);
    // Fallback classification
    return {
      classification: {
        intent: 'question',
        urgency: 'medium',
        topic: 'general inquiry',
        summary: 'Unable to classify email automatically',
      },
    };
  }
}

/**
 * Search documentation for relevant information based on email classification
 *
 * Queries the documentation system to find relevant articles, FAQs, and knowledge base
 * entries that can help answer the customer's email. The search is tailored based on
 * the email's classified intent and topic.
 *
 * @param state - The current email agent state containing classification information
 * @returns Partial state update with search_results array, or error message on failure
 *
 * @remarks
 * This is currently a mock implementation that returns simulated search results.
 * In production, this would integrate with your actual search API or documentation
 * system (e.g., Elasticsearch, Algolia, or a vector database).
 *
 * The function uses the classification data (intent and topic) to generate contextually
 * relevant search results. If classification is not available, it falls back to generic
 * search parameters.
 *
 * @example
 * ```typescript
 * const result = await searchDocumentation({
 *   classification: {
 *     intent: 'bug',
 *     topic: 'authentication',
 *     urgency: 'high',
 *     summary: 'Login issues'
 *   }
 * });
 * // Returns: { search_results: ['Documentation for bug: ...', 'FAQ entry: ...', ...] }
 * ```
 */
async function searchDocumentation(state: EmailAgentState) {
  console.log('Searching documentation...');

  // Build search query from classification
  const classification = state.classification ?? {
    intent: 'question',
    topic: 'general',
  };

  try {
    // Mock search results - in production, this would integrate with your search API
    const searchResults = [
      `Documentation for ${classification.intent}: Basic information about ${classification.topic}`,
      `FAQ entry: Common questions related to ${classification.topic}`,
      `Knowledge base article: How to handle ${classification.intent} requests`,
    ];

    console.log('Found search results:', searchResults.length, 'items');
    return { searchResults: searchResults };
  } catch (error) {
    console.error('Search error:', error);
    return {
      searchResults: [`Search temporarily unavailable: ${error}`],
    };
  }
}

/**
 * Create a bug tracking ticket for the email
 *
 * Generates a new bug tracking ticket in the system when an email is classified
 * as a bug report. This function creates a unique ticket ID and would typically
 * integrate with your bug tracking system (e.g., Jira, GitHub Issues, Linear).
 *
 * @param state - The current email agent state containing email details
 * @returns Partial state update with the generated ticket_id
 *
 * @remarks
 * This is currently a mock implementation that generates a ticket ID using the
 * format "BUG_[unique_id]". In production, this would:
 * - Create an actual ticket in your bug tracking system
 * - Include email content, classification, and customer information
 * - Set appropriate priority and labels based on urgency
 * - Link to customer history if available
 * - Return the real ticket ID from the tracking system
 *
 * @example
 * ```typescript
 * const result = await bugTracking({
 *   email_content: "The login button is not working",
 *   classification: { intent: 'bug', urgency: 'high' }
 * });
 * // Returns: { ticket_id: 'BUG_abc123xyz' }
 * // Logs: "Created ticket: BUG_abc123xyz"
 * ```
 */
async function bugTracking(
  state: EmailAgentState
): Promise<Partial<EmailAgentState>> {
  console.log('Creating bug tracking ticket...');

  // Create ticket in your bug tracking system
  const ticketId = `BUG_${generateId()}`;

  console.log(`Created ticket: ${ticketId}`);
  return { ticketId };
}

/**
 * Generate an AI-powered email response draft
 *
 * Creates a contextual response to the customer email using AI, incorporating
 * relevant documentation, customer history, and classification information.
 * Automatically determines if human review is required based on urgency and
 * complexity, then routes to the appropriate next step.
 *
 * @param state - The current email agent state containing email content, classification, search results, and customer history
 * @returns Command object with the draft response and routing decision
 *
 * @remarks
 * The function performs several key operations:
 * - Gathers context from search results and customer history
 * - Constructs a prompt with email content, classification, and context
 * - Generates a response using the LLM
 * - Determines if human review is needed (high/critical urgency or complex intent)
 * - Routes to either 'human_review' or 'send_reply' accordingly
 *
 * Human review is triggered when:
 * - Urgency is 'high' or 'critical'
 * - Intent is classified as 'complex'
 *
 * On error, the function returns a fallback message and routes to human review
 * for safety.
 *
 * @example
 * ```typescript
 * const result = await writeResponse({
 *   email_content: "How do I reset my password?",
 *   classification: { intent: 'question', urgency: 'low' },
 *   search_results: ['Password reset guide: ...'],
 *   customer_history: { tier: 'premium' }
 * });
 * // Returns: Command with draft_response and goto: 'send_reply'
 * ```
 */
async function writeResponse(state: EmailAgentState) {
  console.log('Writing response...');

  const classification = state.classification ?? {
    intent: 'question',
    urgency: 'medium',
  };

  // Format context from raw state data on-demand
  const contextSections: string[] = [];

  if (state.searchResults) {
    const formattedDocs = state.searchResults
      .map((doc) => `- ${doc}`)
      .join('\n');
    contextSections.push(`Relevant documentation:\n${formattedDocs}`);
  }

  if (state.customerHistory) {
    contextSections.push(
      `Customer tier: ${state.customerHistory.tier ?? 'standard'}`
    );
  }

  // Build the prompt with formatted context
  const draftPrompt = `
Draft a response to this customer email:
${state.emailContent}

Email intent: ${classification.intent}
Urgency level: ${classification.urgency}

${contextSections.join('\n\n')}

Guidelines:
- Be professional and helpful
- Address their specific concern
- Use the provided documentation when relevant
- Be brief
  `;

  try {
    const response = await llm.invoke(draftPrompt);

    // Determine if human review is needed based on urgency and intent
    const needsReview =
      classification.urgency === 'high' ||
      classification.urgency === 'critical' ||
      classification.intent === 'complex';

    // Route to the appropriate next node
    const goto = needsReview ? 'human_review' : 'send_reply';

    if (needsReview) console.log('Needs approval');

    return new Command({
      update: { draftResponse: response.content },
      goto,
    });
  } catch (error) {
    console.error('Error writing response:', error);
    return new Command({
      update: {
        draftResponse: 'Error generating response. Please try again.',
      },
      goto: 'human_review',
    });
  }
}

/**
 * Human review node for email response approval
 *
 * This node pauses the workflow execution to allow a human reviewer to approve,
 * edit, or reject the drafted email response. It uses the interrupt() function
 * to halt execution and wait for human input.
 *
 * @param state - The current email agent state containing the draft response and classification
 * @returns Command object directing the workflow to either send the reply or end
 *
 * @remarks
 * The interrupt() call must come first in the function - any code before it will
 * re-run when the workflow resumes. The human reviewer can:
 * - Approve the draft as-is (routes to 'send_reply')
 * - Edit and approve the draft (routes to 'send_reply' with edited content)
 * - Reject the draft (routes to END, human will handle directly)
 *
 * @example
 * ```typescript
 * // When workflow is paused, human provides decision:
 * const decision = {
 *   approved: true,
 *   edited_response: "Updated response text..."
 * };
 * // Workflow resumes and routes to 'send_reply' with edited response
 * ```
 */
async function humanReview(state: EmailAgentState) {
  const classification = state.classification ?? {
    urgency: 'medium',
    intent: 'question',
  };

  // interrupt() must come first - any code before it will re-run on resume
  const humanDecision = interrupt({
    emailId: state.emailId,
    originalEmail: state.emailContent,
    draftResponse: state.draftResponse ?? '',
    urgency: classification.urgency,
    intent: classification.intent,
    action: 'Please review and approve/edit this response',
  });

  if (humanDecision.approved) {
    const editedResponse = humanDecision.editedResponse ?? state.draftResponse;
    return new Command({
      update: { draftResponse: editedResponse },
      goto: 'send_reply',
    });
  }
  return new Command({
    update: {},
    goto: END,
  });
}

/**
 * Send the final email response to the customer
 *
 * This node handles the actual sending of the email response. In production,
 * this would integrate with your email service (e.g., Gmail API, SendGrid, SMTP)
 * to deliver the response to the customer. Currently, it logs a preview of the
 * response being sent.
 *
 * @param state - The current email agent state containing draft_response
 * @returns Empty partial state (email sending is a side effect)
 *
 * @remarks
 * This is the final step in the email workflow after the response has been
 * drafted and optionally reviewed by a human. The function expects draft_response
 * to be populated in the state.
 *
 * @example
 * ```typescript
 * const result = await sendReply({
 *   draft_response: "Thank you for contacting us. Here's the solution...",
 *   sender_email: "customer@example.com"
 * });
 * // Logs: "Sending reply: Thank you for contacting us. Here's the solution..."
 * // Returns: {}
 * ```
 */
async function sendReply(
  state: EmailAgentState
): Promise<Partial<EmailAgentState>> {
  // Integrate with email service
  const preview = state.draftResponse?.substring(0, 60) + '...';
  console.log(`Sending reply: ${preview}`);

  // In production, you would send the actual email here
  return {};
}

const memory = new MemorySaver();

export const graph = new StateGraph(EmailStateDefinition)
  // Add nodes - nodes with Command returns need ends arrays
  .addNode('read_email', readEmail)
  .addNode('classify_intent', classifyIntent)
  .addNode('search_documentation', searchDocumentation)
  .addNode('bug_tracking', bugTracking)
  .addNode('write_response', writeResponse, {
    ends: ['human_review', 'send_reply'],
  })
  .addNode('human_review', humanReview, { ends: ['send_reply', END] })
  .addNode('send_reply', sendReply)
  // Add edges
  .addEdge(START, 'read_email')
  .addEdge('read_email', 'classify_intent')
  .addEdge('classify_intent', 'search_documentation')
  .addEdge('classify_intent', 'bug_tracking')
  .addEdge('search_documentation', 'write_response')
  .addEdge('bug_tracking', 'write_response')
  .addEdge('send_reply', END)
  // Compile with checkpointer for persistence
  .compile({ checkpointer: memory });
