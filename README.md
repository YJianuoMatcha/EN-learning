# English Output Trainer v6

Adaptive English output coach with progressive academic discussion.

## Run

1. Copy `.env.example` to `.env`.
2. Put your OpenAI API key in `.env`.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000

## v6 Academic Discussion

Academic mode now works as a multi-round conversation:

1. AI randomly chooses a broad academic topic.
2. It starts with an accessible opening question.
3. After each answer, AI evaluates language and discussion depth.
4. AI chooses the next question based on actual performance.
5. Difficulty can stay, rise, or simplify; it is not a fixed ladder.
6. The same topic is developed progressively from opinion to explanation, mechanism/example, evidence/trade-offs, and critical evaluation.

The browser stores completed practice history locally. No database is required for local use.
