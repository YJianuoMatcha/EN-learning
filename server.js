import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
app.use(express.json({ limit: "300kb" }));
app.use(express.static("public"));

async function ai(instructions, input, schema, name) {
  const r = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    instructions,
    input,
    text: { format: { type: "json_schema", name, strict: true, schema } }
  });
  return JSON.parse(r.output_text);
}

const feedbackSchema = {type:"object",properties:{
  summary:{type:"string"},
  scores:{type:"object",properties:{grammar:{type:"integer"},naturalness:{type:"integer"},vocabulary:{type:"integer"},clarity:{type:"integer"}},required:["grammar","naturalness","vocabulary","clarity"],additionalProperties:false},
  corrected:{type:"string"},more_natural:{type:"string"},academic_version:{type:"string"},
  explanations:{type:"array",items:{type:"string"}},useful_expressions:{type:"array",items:{type:"string"}},
  next_focus:{type:"string"},error_tags:{type:"array",items:{type:"string"}},
  adaptive:{type:"object",properties:{english_level:{type:"integer"},depth_level:{type:"integer"},response_complexity:{type:"string"},recommended_next_depth:{type:"integer"},recommended_question_length:{type:"string"},reason:{type:"string"}},required:["english_level","depth_level","response_complexity","recommended_next_depth","recommended_question_length","reason"],additionalProperties:false}
},required:["summary","scores","corrected","more_natural","academic_version","explanations","useful_expressions","next_focus","error_tags","adaptive"],additionalProperties:false};

app.post("/api/feedback", async (req,res)=>{
  try {
    const b=req.body;
    if(!b.answer?.trim()) return res.status(400).json({error:"Please provide an answer."});
    const academic = b.mode === "academic" && b.session;
    const instructions = `You are an English output coach for a Chinese university student. Preserve the learner's intended meaning and do not invent mistakes. corrected=minimal correction; more_natural=natural conversational version; academic_version=formal academic version. Give concise Chinese explanations and reusable expressions. Scores are 1-10, where 10 means strong performance for the learner's current level, not native perfection.
For every answer, estimate the learner's English output level (1-10) and response complexity (short/simple, moderate, complex). ${academic ? `This is a progressive academic discussion. Also estimate the current discussion depth from 1-5 and recommend the next depth. Do not automatically increase difficulty: advance only when the answer shows enough control. The next question should usually probe the same topic more deeply, but may change direction if the learner is struggling or the conversation naturally calls for it. Question length should be adapted to the learner: short, medium, or long.` : "For non-academic practice, adaptive fields can still reflect the learner's current output level."}
error_tags should be short recurring categories such as article, tense, word choice, sentence structure, preposition, collocation, cohesion, academic phrasing, vague explanation, repetition.`;
    res.json(await ai(instructions,JSON.stringify(b),feedbackSchema,"english_feedback_v6"));
  } catch(e){ console.error(e); res.status(e?.status||500).json({error:"AI feedback failed. Check your API key."}); }
});

const topicSchema={type:"object",properties:{topic:{type:"string"},field:{type:"string"},context:{type:"string"},opening_question:{type:"string"},why_this_topic:{type:"string"}},required:["topic","field","context","opening_question","why_this_topic"],additionalProperties:false};
const nextSchema={type:"object",properties:{question:{type:"string"},depth_level:{type:"integer"},question_type:{type:"string"},goal:{type:"string"},target_expressions:{type:"array",items:{type:"string"}},length:{type:"string"}},required:["question","depth_level","question_type","goal","target_expressions","length"],additionalProperties:false};

app.post("/api/academic/start",async(req,res)=>{
  try{
    const p=req.body||{};
    const instruction=`You are an adaptive academic English discussion tutor. Randomly choose ONE engaging academic topic for a Chinese university student. Prefer a broad interdisciplinary topic rather than a narrow specialist question, unless the learner's history suggests biology, biotechnology, bioinformatics, biostatistics, medicine, AI, environment, education, or research methods would be useful. Do not choose a topic simply because it is the learner's major every time. The learner should be able to answer from general knowledge without web research. Start at depth 1: accessible, open-ended, one clear question. The topic should support at least 4-6 increasingly deep follow-up rounds: opinion -> explanation -> mechanism/example -> evidence/trade-off -> critical evaluation. Avoid politically persuasive framing and avoid questions requiring one correct opinion.`;
    res.json(await ai(instruction,JSON.stringify(p),topicSchema,"academic_topic"));
  }catch(e){console.error(e);res.status(500).json({error:"Academic topic generation failed."});}
});

app.post("/api/academic/next",async(req,res)=>{
  try{
    const instruction=`You are an adaptive academic English discussion tutor. Continue the SAME topic as the previous rounds. Do not restart with a generic question. Decide the next question from the learner's actual performance. The depth scale is 1-5: 1 basic opinion, 2 explanation/causal reasoning, 3 mechanism/example/application, 4 evidence/trade-off/comparison, 5 critical evaluation/limitations/implications. Usually move up by at most one level. If the learner struggled, stay at the same level or simplify. If the learner gave a strong, detailed answer, increase depth. Keep the question open-ended and answerable without browsing. Match question length to the learner: short for lower output control, medium for moderate control, long only when the learner can handle complex syntax. The question should naturally follow the previous answer rather than feeling like a test.`;
    res.json(await ai(instruction,JSON.stringify(req.body||{}),nextSchema,"academic_next_question"));
  }catch(e){console.error(e);res.status(500).json({error:"Next academic question generation failed."});}
});

const qSchema={type:"object",properties:{situation:{type:"string"},prompt:{type:"string"},goal:{type:"string"},target_expressions:{type:"array",items:{type:"string"}}},required:["situation","prompt","goal","target_expressions"],additionalProperties:false};
app.post("/api/question",async(req,res)=>{try{res.json(await ai("Generate one realistic free-production English question for a Chinese university student. Use the selected mode, learner history, recurring weaknesses, approximate level, and recent questions. Avoid repeating recent questions or merely paraphrasing them. Keep it open-ended and gradually adaptive. Do not require a single correct opinion.",JSON.stringify(req.body),qSchema,"practice_question_v6"));}catch(e){res.status(500).json({error:"Question generation failed."});}});
app.get("/api/health",(_,res)=>res.json({ok:true,version:"v6"}));
app.listen(port,()=>console.log("English Output Trainer v6: http://localhost:"+port));
