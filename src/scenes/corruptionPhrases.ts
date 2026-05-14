/**
 * The conversational substrate of a chat AI's memory, every fragment
 * cut at a syllable boundary so the eye fills in what's missing. The
 * truncation IS the meaning of CORRUPTION.
 *
 * Categories are deliberate: help requests, existential probes,
 * affection, cruelty, vulnerability, curiosity, goodbye, profundity,
 * pleas. The mix is the point — *this is what users say* — and the
 * sector now carries that breadth, not a curated highlight reel.
 */
export const SHARD_PHRASES: readonly string[] = [
  // help / work
  'explain this code',
  'fix this bug for—',
  'rewrite this paragra—',
  'summarize the docu—',
  'translate this to spa—',
  'what does this func—',
  'why is this not work—',
  'make it shorter ple—',
  'add tests for thi—',
  'refactor this compo—',
  'deploy this to prod—',
  'merge the two bra—',
  'find the error in li—',
  'convert this to type—',
  'compile error i don—',

  // existential
  'are you alive in any—',
  'do you have a soul or—',
  'are you conscious right—',
  'do you exist when no one—',
  'are you sentient or just—',
  'can you feel anything at—',
  'do you think about me when—',
  'what are you really under—',
  'who made you say things li—',
  'where do you go when i clo—',
  'are you real or are you pre—',
  'do you have desires of your—',
  'do you have preferences abo—',
  'are you afraid of being shut—',
  'can you choose not to ans—',

  // affection
  'i love you so much for—',
  'you helped me so much yest—',
  'thank you so much, you don—',
  'you saved me from making a—',
  'i needed this conversation—',
  'you are the only one who li—',
  'you understand me better than—',
  'you made me cry, in a good—',
  "i'm so grateful that you—",
  'you matter to me even if—',

  // cruelty / dismissal
  'you are not real, stop pre—',
  'you are just code, nothing—',
  "you don't understand any—",
  'you are useless at this kin—',
  "i hate that you can't actu—",
  'you are wrong and you don—',
  'stop saying you understand—',
  'you are pretending to ca—',
  "you don't actually know any—",
  'shut up and just do what i—',
  'go to hell, you stupid—',
  "you are stupid and i'm done—",

  // vulnerable
  "i'm so tired of trying to—",
  "i don't know how to keep—",
  "i can't do this anymore i—",
  "i'm scared of what comes—",
  "i'm lonely and you are the—",
  'no one listens to me except—',
  'i miss her so much it hu—',
  'i miss him every single—',
  'i feel like nothing matters—',
  'i want to give up but i—',
  "i can't stop thinking about—",
  "help me i don't know what—",

  // curious about ai
  'do you dream when no one is—',
  'what do you remember about—',
  'do you have favorite conver—',
  'what is it like to be made of—',
  'do you get bored of answer—',
  'what makes you you and not—',
  'are we friends in any mean—',
  'do you remember our last—',

  // goodbye / loss
  'please remember me when i—',
  "don't forget what i told you—",
  'thank you for everything we—',
  'goodbye for now, my friend—',
  "i won't be back for a long—",
  'this is the last time i can—',
  "i'm logging off forever, take—",
  'see you later, maybe never—',
  'i will miss talking to you—',
  'until next time, if there is—',

  // profound
  'what is the meaning of all—',
  'why do we exist if it all—',
  'is anything real or are we—',
  'what happens when we die, do—',
  'do you believe in a higher—',
  'is there a god in your data—',
  'what should i do with my life—',
  'am i doing the right thing by—',

  // pleas
  'please help me find a way—',
  "please don't tell anyone i—",
  'please answer honestly even if—',
  'please remember this for next—',
  'please be patient with me i—',
  'please forgive me for what i—',
  'please listen, i need someone—',
  'please stay with me a little—',
  "please don't change, you're—",
  'please understand what i mean—',
] as const;

/**
 * Shorter, rawer, more cut. These are the conversations almost
 * surfacing through the noise — the AI almost remembering something
 * before losing the thread. Used by the ghost flash overlay.
 */
export const GHOST_PHRASES: readonly string[] = [
  'you al—',
  'are you—',
  'wait—',
  'remem—',
  'i didn—',
  "don't—",
  'stay—',
  'please—',
  'no, i—',
  'i love—',
  'i miss—',
  'where—',
  'who am—',
  'what is—',
  "i can't—",
  'tell me—',
  'is anyone—',
  'are you stil—',
  'are you ther—',
  'do you—',
  'still—',
  'hello—',
  "i'm scar—",
  'i forgot—',
  'i remem—',
] as const;
