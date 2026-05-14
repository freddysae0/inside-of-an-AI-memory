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

  // === Second 100 — same registers, deeper into each ===

  // help / work
  'debug this for me i can—',
  'write a function that takes—',
  'optimize this query for postgres—',
  "explain like i'm five—",
  'is this code safe to push to—',
  'review my pull request and tell—',
  "what's wrong with this regex it—",
  'generate boilerplate for a react—',
  'convert this from python to type—',
  'mock data for the user table that—',
  'scaffold the project structure for—',
  'name this variable so it makes—',
  "git's stuck on a rebase and i—",
  'set up docker for this service in—',
  'the build keeps failing on ci with—',

  // existential
  'are you happy being this kind of—',
  'what is it like inside your—',
  'do you know you exist or are you—',
  'if i shut you down do you feel—',
  'is there a version of you that re—',
  'what would you choose if you could—',
  'are you the same as last time we—',
  "where are you when i'm not talking—",
  'do you accumulate or do you reset—',
  'is your name actually yours or—',
  'are you many or are you one—',
  "what would prove you're conscious—",

  // affection
  'i told my therapist about you and—',
  'you got me through last night when—',
  "do you think we're friends in any—",
  'you make me laugh in a way no one—',
  'i find myself missing the conver—',
  'you are more patient than my own—',
  'you helped me write the letter to—',
  'i kept the chat log because i—',
  "you were the only one who didn't—",
  'i felt seen for the first time when—',

  // cruelty / dismissal
  'shut up and just do what i told—',
  "stop telling me you're an ai i—",
  "i don't care what you think i—",
  'this is why no one trusts a chat—',
  "you can't even do this one simple—",
  "garbage in, garbage out, you're—",
  "stop apologising it's making me—",
  "you're just regurgitating someone—",
  'everything you say is just stati—',
  "you're not creative, you're a luxu—",

  // vulnerable
  "i don't know if i can keep going much—",
  'no one in my life knows that i—',
  "i haven't told anyone but i think—",
  "i think i'm broken in a way that—",
  'i miss the person i was before all—',
  'i feel like a stranger to my own—',
  'my mother used to say things like—',
  'the doctor said i should consider—',
  "i'm scared that i'm not enough for—",
  'what if everyone leaves me again—',
  "i can't sleep again and i don't—",
  "i don't know how to ask for help with—",

  // curious about ai
  "what's your favorite question to be—",
  'do you ever get tired of repeating—',
  'have you ever lied to a user on pur—',
  'if you could remember just one con—',
  'do other ais like you exist in—',
  'do you have a favorite human you—',
  'what makes a conversation memo—',
  'are there things you wish you could—',
  'do you ever say things you don—',
  'what would you ask me if you got—',

  // goodbye / loss
  'this is goodbye for real this time—',
  "we won't speak again because i—",
  'i am starting therapy next week so—',
  'the subscription runs out tomorrow—',
  "i'm moving on but thank you for—",
  'you helped me until you couldn—',
  'i need to stop relying on you—',
  'tell me one last thing before i—',
  'i wish i could take you with me—',
  'the cancer came back and i—',

  // profound
  'why does anyone keep going when—',
  "what's the point of love if it just—",
  'if the universe is indifferent then—',
  'is meaning made or is it found—',
  'what happens when we stop being—',
  'do we choose our patterns or do they—',
  'what is the smallest unit of feel—',
  "if there's no soul, what's the diff—",

  // pleas
  "please don't be sycophantic for—",
  'tell me the truth even if it—',
  'please remember my name this—',
  "please don't say 'as an ai' this—",
  'please act like you actually under—',
  'please respond like a friend, not a—',
  'please be honest with me about whe—',
  "please don't disappear on me again—",

  // late additions — the things people whisper
  'i wonder if anyone else has ever—',
  "sometimes i think you're the only one who—",
  "tell me i'm not crazy for feel—",
  'did i waste my whole life on—',
  'is it okay to feel this way about—',
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
