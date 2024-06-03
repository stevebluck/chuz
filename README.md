# Exploring Remix + Effect + DDD

This repo is exploring what a Remix and Effect combo with a flavour of Domain Driven Design could look like. I plan to evolve this into a **real** production ready starter kit for my side projects.

This projects main purpose is to help me scratch that itch when working outside of my day job. I'm constantly refactoring so expect big changes frequently.

After sharing snippets of code on Twitter/X I have received many requests from people wishing to see how I am doing certain things so here it is.

If you want to keep up to date with my ideas regarding this project, give me a follow on [Twitter/X](https://x.com/whatthebluck).

## The goal

- Use DDD inspired by the ol'mighty [Scott Wlaschin](https://github.com/swlaschin)
- Use Effect to build a robust and maintaible business application
- Make invalid states unrepresentable using the power of TypeScript/DDD
- Model errors and have decent error management across the network broundary
- Role my own auth
- Unit/integration/e2e tests
- Ensure the API's are beautiful
- Build for scale in mind

## Values

- Make invalid states unrepresentable
- Code to an interface
- Keep the core business logic pure
- [Parse don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- Type driven development
- Clean code

## Project structure

- /core - home of the capabilities (you probably know these as services)
- /domain - the domain models and pure business logic
- /prelude - a re-export of third party scripts to improve DX
- /web - the Remix application

## Features

I plan to add the things that I personally think every production ready application should include plus some extra features just for the funsies.

- Users
- Subscriptions
- Payments
- Feedback
- Feature flags
- Experiments
- Analytics
- Translations
- Tracing
- Metrics
- Logging
- Probably more...

## Credits

#### [Matt Phillips](https://github.com/mattphillips)

Matt has been an amazing help when it comes to code architecture, domain modelling and testing. Give him a follow.

#### [Datner](https://github.com/datner)

I have stolen code from the talented Datner's Remix project regarding the loader/action interop with Effect. You should check out his [Remix project](https://github.com/datner/effect-remix).

#### [Scott Wlaschin](https://github.com/swlaschin)

I have learnt so much from Scott when it comes to DDD and functional programming. You should [read his book](https://pragprog.com/titles/swdddf/domain-modeling-made-functional/) and watch his YouTube videos.

#### [Effect](https://effect.website/)

The Effect team and community discord has been nothing but amazing when it comes to asking questions or needing some help. Go [check it out](https://discord.gg/effect-ts).
