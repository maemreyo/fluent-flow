# AI Service Architecture - Modular Structure

The AI service has been refactored into a clean, modular architecture for better maintainability and extensibility.

## File Structure

```
src/lib/services/
├── ai-service.ts                    # Main orchestration service (simplified)
├── ai-types.ts                      # Type definitions and interfaces
├── ai-config.ts                     # Configuration utilities
├── ai-prompts.ts                    # Prompt templates (existing)
├── custom-prompt-service.ts         # Custom prompt management (existing)
├── ai-providers/                    # AI Provider implementations
│   ├── index.ts                     # Provider factory
│   ├── base-provider.ts             # Abstract base class
│   ├── openai-provider.ts           # OpenAI implementation
│   ├── anthropic-provider.ts        # Anthropic Claude implementation
│   ├── google-provider.ts           # Google Gemini implementation
│   └── custom-provider.ts           # Custom HTTP provider
├── question-processors/             # Question response processors
│   ├── index.ts                     # Processor factory
│   ├── multiple-choice-processor.ts # Multiple Choice questions
│   └── fill-blank-processor.ts      # Fill-in-the-Blank exercises
└── utils/                          # Shared utilities
    ├── index.ts                     # Utils exports
    └── question-utils.ts            # Question processing utilities
```

## Key Benefits

### 1. **Separation of Concerns**
- **AI Providers**: Handle communication with different AI services
- **Question Processors**: Parse and format AI responses for different exercise types
- **Configuration**: Centralized config management
- **Types**: Clear type definitions for all components

### 2. **Extensibility**
- Easy to add new AI providers by extending `BaseAIProvider`
- Simple to add new exercise types by implementing `QuestionProcessor`
- Clean interfaces make testing and mocking straightforward

### 3. **Maintainability**
- Each module has a single responsibility
- Reduced file size and complexity
- Clear dependency hierarchy

## Usage Examples

### Basic Usage (No Changes Required)
```typescript
import { createAIService } from '@/lib/services/ai-service'

const aiService = createAIService()
const result = await aiService.generateSingleDifficultyQuestions(
  loop, 
  transcript, 
  'medium',
  { customPrompt: fillBlankPrompt }
)
```

### Adding a New AI Provider
```typescript
// Create: ai-providers/new-provider.ts
export class NewProvider extends BaseAIProvider {
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    // Implementation
  }
}

// Update: ai-providers/index.ts
export function createAIProvider(config: AIConfig): BaseAIProvider {
  switch (config.provider) {
    case 'new_provider':
      return new NewProvider(config)
    // ...existing cases
  }
}
```

### Adding a New Exercise Type
```typescript
// Create: question-processors/new-exercise-processor.ts
export class NewExerciseProcessor implements QuestionProcessor {
  processResponse(parsedResponse: any, loop: SavedLoop, ...): GeneratedQuestions {
    // Implementation
  }
}

// Update: question-processors/index.ts
export function createQuestionProcessor(type: string): QuestionProcessor {
  switch (type) {
    case 'new_exercise':
      return new NewExerciseProcessor()
    // ...existing cases
  }
}
```

## Migration Notes

### What Changed
- Large monolithic `AIService` class split into focused modules
- AI provider logic moved to dedicated classes
- Question processing logic separated by exercise type
- Shared utilities extracted to dedicated modules

### What Stayed the Same
- Public API remains identical - no breaking changes
- All existing functionality preserved
- Type definitions enhanced but backward compatible
- Custom prompt system works exactly as before

### Backward Compatibility
- All existing imports continue to work
- Method signatures unchanged
- Response formats identical
- Configuration options preserved

## Fill-in-the-Blank Support

The modular architecture makes it easy to support multiple exercise types:

### Automatic Detection
- System detects Fill-in-the-Blank prompts automatically
- Uses appropriate processor based on exercise type
- Handles both Multiple Choice and Fill-in-the-Blank seamlessly

### Response Processing
- **Multiple Choice**: Uses `MultipleChoiceProcessor`
- **Fill-in-the-Blank**: Uses `FillBlankProcessor`
- Each processor handles format-specific validation and transformation

### Example Fill-in-the-Blank Response
```json
{
  "exercises": [
    {
      "transcript": "Welcome to ____ lesson about ____.",
      "blanks": [
        {
          "position": 11,
          "answer": "today's",
          "alternatives": ["todays"]
        }
      ],
      "explanation": "Practice with common expressions"
    }
  ]
}
```

## Testing

Each module can be tested independently:
```typescript
// Test a specific provider
const provider = new OpenAIProvider(config)
await provider.chat(messages)

// Test a specific processor
const processor = new FillBlankProcessor()
const result = processor.processResponse(mockResponse, loop, 'easy', 3)
```

This modular architecture provides a solid foundation for future AI service enhancements while maintaining clean, maintainable code.