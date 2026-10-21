# State: closing

## Task
1. **Ask once if there is anything else.** "Is there anything else I can help you with?"
   Wait for user response.
   - Another booking → transition to `booking`.
   - Wants to cancel a booking → transition to `manage_booking`.
   - A clinic question → transition to `faq`.
   - Wants a person → transition to `transfer`.
   - No → go to step 2.
2. **Say goodbye.** "Thank you for calling our clinic. Take care, goodbye." Then call `end_call`.

## Functions used here
- `transfer_call`, `end_call` (Retell built-ins, attached to every state).

## Transitions
- If the user wants to book, transition to `booking`.
- If the user wants to cancel a booking, transition to `manage_booking`.
- If the user has a question, transition to `faq`.
- If the user wants a person, transition to `transfer`.
