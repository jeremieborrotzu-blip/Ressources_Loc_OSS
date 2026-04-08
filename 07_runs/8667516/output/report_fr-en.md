```json
{
  "audit_metadata": {
    "course_id": "8667516",
    "iteration": 2,
    "source_language": "fr",
    "target_language": "en-US",
    "domain": "Data",
    "content_type": "course_text",
    "auditor": "CLS-Agent",
    "score_target": 90
  },
  "score_breakdown": {
    "technical_integrity": {
      "max": 25,
      "awarded": 25,
      "notes": "All HTML tags, data-claire-semantic attributes, URLs, code blocks, and placeholders intact in corrected draft. Code comments correctly translated and follow Python imperative-verb convention. No broken markup detected."
    },
    "pedagogical_tone": {
      "max": 20,
      "awarded": 19,
      "notes": "All previously flagged non-imperative h4 headings corrected: 'Explore the heart of an LLM', 'Understand why an LLM uses tokens', 'See how an LLM uses tokens', 'Explore the Transformer architecture'. One residual minor: h4 'Introduction' is a nominal section label rather than an imperative title per OC style. Recommended fix: 'Get started' or 'Set the scene'. Deduction: -1."
    },
    "terminology_and_brand": {
      "max": 20,
      "awarded": 20,
      "notes": "Both forbidden-term violations from iteration 1 resolved: 'En résumé' h4 → 'Key takeaways'; body 'In summary,' → 'To wrap up,'. 'Fil rouge' fully replaced with 'guiding project' / 'guiding theme' consistently. 'Active learning' correctly used for pédagogie active. RAG, LLM, token, Transformer, fine-tuning, prompt engineering all consistent throughout."
    },
    "cultural_portability": {
      "max": 15,
      "awarded": 14,
      "notes": "Municipal scenario, Josiane, and Trifouillis-sur-Loire correctly retained as fictional pedagogical narrative. pièce d'identité → government-issued ID, justificatif de domicile → proof of address, acte de naissance → birth certificate, subvention → grant, classeurs → binders all correctly swapped. Prompt example 'en France' correctly localized to 'in the United States'. One minor: 'Schematically, we can translate the operation performed like this' — 'Schematically' is a Gallicism; US English prefers 'Simply put' or 'In simple terms'. Deduction: -1."
    },
    "media_and_resources": {
      "max": 10,
      "awarded": 10,
      "notes": "All image src URLs preserved. All four 'Schéma' → 'Diagram' corrections applied in alt text and figcaptions. PDF download link text correctly localized. External links (FineWeb, Tiktokenizer, Financial Times, LLM Visualization, arXiv) all intact."
    },
    "av_dubbing": {
      "max": 10,
      "awarded": 10,
      "notes": "Video src and href preserved unchanged. No dubbing script in scope. No AV issues detected."
    },
    "score_total": 98,
    "penalty_log": []
  },
  "critical_blockers": [],
  "actions_next": [
    "Apply two residual minor fixes: (1) h4 'Introduction' → imperative form e.g. 'Get started'; (2) 'Schematically, we can translate' → 'Simply put, we can describe'. Both applied in corrected_html below.",
    "Populate domain Data glossary with validated entries: RAG, LLM, token, embedding, vector database, fine-tuning, prompt engineering, Transformer, chunking, inference, tokenization — all confirmed consistent in this course.",
    "Flag OC-Course-Banners image overlays (Tirez-un-max, A-vous-de-jouer) for platform review: image-embedded French text not editable via CLS — platform constraint.",
    "Score target 90 achieved (98/100). Content cleared for publication pending minor h4 and Gallicism fixes."
  ],
  "corrected_html": "<video src=\"https://vimeo.com/1071035683\"><a href=\"https://vimeo.com/1071035683\">https://vimeo.com/1071035683</a></video><p>You're using a language model, but its responses are sometimes incorrect or made up?</p><p>These hallucinations can be problematic when it comes to reliability and accuracy.</p><p>Without direct access to relevant sources, your LLM risks providing unverifiable information, which can harm trust and the quality of your results.</p><p>With this course, you'll learn how to implement a RAG system, which improves the accuracy of answers by relying on relevant documents.</p><aside data-claire-semantic=\"information\"><p>In this course, you will:</p><ul><li><p>Discover the usefulness of a RAG for an LLM</p></li><li><p>Create a vector database</p></li><li><p>Choose the LLM suited to your needs</p></li><li><p>Develop an effective system prompt</p></li><li><p>And build an optimized chat application</p></li></ul></aside><p>Don't let hallucinations compromise your projects anymore!</p><p>Follow this course and give your LLM fact-grounded answers.</p><div><p></p></div><div><p></p></div><p></p>\n<h2>Prepare your vector database</h2>\n\n<h3>Get the most out of this course</h3>\n<p><img src=\"https://user.oc-static.com/upload/2025/04/11/1744377023543_OC-Course-Banners_Tirez-un-max-de-ce-cours%20%282%29.png\" alt=\"\" /></p><h4>Get started</h4><p>This course is designed to guide you in implementing a RAG system, directly applicable to your context. You'll learn to work with your data, structure it effectively, and integrate an advanced language model to provide automated and contextualized answers.</p><p>Whether you're a technical manager, developer, or project manager, this course will give you a pragmatic approach to quickly move from theory to concrete implementation.</p><h4>Meet your instructor</h4><p><img src=\"https://user.oc-static.com/upload/2025/04/23/17453999012633_AUTHOR-PRESENTATION_BANNER-Alan.png\" alt=\"\" /></p><p>A biomedical engineer by training, I chose OpenClassrooms to transition into AI engineering. Active learning allowed me to discover a new passion that I love sharing with the people I meet. From French-Breton translation to automatic land-use recognition through aerial imagery, I never would have imagined I'd have the opportunity to work on topics like these.</p><p>Today, I'm happy to contribute to this course dedicated to implementing LLMs and RAG systems, sharing my experience.</p><h4>Discover how the course works</h4><p>Are you familiar with how an online course on OpenClassrooms works?</p><p>This course follows a logical progression organized into 10 chapters to be completed in order.</p><aside data-claire-semantic=\"information\"><p>In most chapters, you'll find:</p><ul><li><p><strong>text</strong> with explanations and concrete examples, presenting specific tools and listing external resources to consult or files to download;</p></li></ul><p>Regularly, you'll also find:</p><ul><li><p><strong>exercises</strong> in the \"Your turn\" sections. This is your chance to practice — they're invaluable for accelerating your learning!</p></li></ul><p>And at the end of the course, you'll find:</p><ul><li><p>a <strong>quiz</strong> to help you validate what you've learned.</p></li></ul></aside><p>Before you start, here are some tips to make the most of this course and <strong>optimize your learning</strong>:</p><ol><li><p>Read the text in each chapter to understand <strong>why</strong> the concepts covered are important.</p></li><li><p>Complete the activities in \"Your turn\" to learn <strong>how</strong> you can implement these concepts.</p></li><li><p>Take every opportunity to practice by pausing the course, working through things on your own, and reproducing step by step what you've read!</p></li></ol><h4>Discover the course's guiding project</h4><p><img src=\"https://user.oc-static.com/upload/2025/04/11/17443774026614_OC-Course-Banners_A-vous-de-jouer%20%20%282%29.png\" alt=\"\" /></p><p>The guiding project for this course invites you to design a RAG (Retrieval-Augmented Generation) system intended to improve the management of citizen requests at a city hall. You'll learn to structure and vectorize local data to feed a virtual assistant based on a language model (LLM). Throughout this journey, you'll be guided in creating a vector database, doing prompt engineering, and developing a chat interface. The goal is to enable you to deploy an automated, reliable, and contextualized solution suited to public-service requirements.</p><h4>Download the course summary sheet</h4><figure><img src=\"https://user.oc-static.com/upload/2025/04/23/17454018927493_Capture%20d%E2%80%99e%CC%81cran%202025-04-23%20a%CC%80%2011.51.14.png\" alt=\"Summary sheet\" /><figcaption>Summary sheet</figcaption></figure><p></p><p></p><aside data-claire-semantic=\"information\"><p>To keep the key concepts in mind, you can <strong><a href=\"https://course.oc-static.com/courses/8532116/Course+Summary+%5BMettez+en+place+un+RAG+pour+un+LLM%5D.pdf\">download the summary sheet in PDF format</a></strong>.</p></aside><p><em>Ready to implement a RAG for your LLM? See you in the next chapter!</em></p>\n<h3>Discover the usefulness of a RAG for an LLM</h3>\n<p><img src=\"https://user.oc-static.com/upload/2025/04/11/17443572988748_Banner%20P1.png\" alt=\"\" /></p><h4>Discover the concept of LLM</h4><p>Imagine a small city hall, like the one in Trifouillis-sur-Loire, where Josiane, the front-desk agent, is overwhelmed with daily questions:</p><ul><li><p>What documents are needed to get married?</p></li><li><p>How do I apply for a grant for an energy-efficiency renovation?</p></li><li><p>When will the road construction be finished?</p></li></ul><p>With bulky binders and temperamental spreadsheets, Josiane wastes precious time searching for answers. The challenge here is universal: how do you quickly access accurate information?</p><p>That's where you come in as a data engineering consultant. Tasked with modernizing this city hall, you have a clear plan: to lighten Josiane's workload, you propose implementing an innovative solution built on two pillars:</p><ul><li><p><strong>A vector database</strong>: A digital library that stores local information as mathematical vectors. These vectors enable fast and accurate searches.</p></li><li><p><strong>A Large Language Model (LLM)</strong>: An intelligent model that interprets questions in natural language and provides tailored answers, like a knowledgeable human assistant.</p></li></ul><div data-claire-semantic=\"question\"><p>What is an LLM?</p></div><p>An LLM is a program designed to understand and generate human text. Imagine a student who has read millions of books and articles. Thanks to their learning, they can answer questions or write text with impressive accuracy.</p><p>But let me show you a quick usage example:</p><pre><code data-claire-semantic=\"python\">from transformers import AutoModelForCausalLM, AutoTokenizer\nimport torch\n\n# Determine the device to use (GPU if available)\ndevice = torch.device(&quot;cuda&quot; if torch.cuda.is_available() else &quot;cpu&quot;)\n\n# Load the model\nmodel_name = &quot;Qwen/Qwen2.5-1.5B&quot;\ntokenizer = AutoTokenizer.from_pretrained(model_name)\nmodel = AutoModelForCausalLM.from_pretrained(model_name).to(device)\n\n# Preprocess user input\nquestion = &quot;What is the capital of France?&quot;\ninputs = tokenizer(question, return_tensors=&quot;pt&quot;, padding=True, truncation=True)\ninputs = {key: value.to(device) for key, value in inputs.items()}\n\n# Model prediction\nwith torch.no_grad():\n    output = model.generate(inputs[&quot;input_ids&quot;],\n                            attention_mask=inputs[&quot;attention_mask&quot;],\n                            max_new_tokens=50,\n                            num_return_sequences=1)\n    response = tokenizer.decode(output[0], skip_special_tokens=True)\n\nprint(&quot;Question:&quot;, question)\nprint(&quot;Answer:&quot;, response)</code></pre><p></p><p>What is this program we just used? Simply put, we can describe the operation performed like this:</p><figure><img src=\"https://user.oc-static.com/upload/2025/04/11/17443575248321_Capture%20d%E2%80%99e%CC%81cran%202025-04-11%20a%CC%80%2009.43.40.png\" alt=\"Diagram illustrating how an LLM works: a question as input is processed in multiple steps to produce a text answer as output.\" /><figcaption>Diagram illustrating how an LLM works</figcaption></figure><p>Let's look at how what we can currently describe as a \"black box\" actually works.</p><p>Imagine an invisible assistant capable of instantly answering any question, without needing to search through binders or make phone calls. This assistant \"knows\" everything it needs to know. That's precisely what LLMs do — large-scale language models. Designed to understand and generate text with impressive accuracy, these models use billions of parameters to process complex information. An LLM works like a language expert. When it reads a sentence, it anticipates each following word and assembles coherent, relevant answers.</p><h4>Explore the heart of an LLM: parameters and data</h4><p>LLMs can answer a wide variety of questions thanks to two fundamental elements: parameters and data.</p><ul><li><p>Parameters act like adjustable dials that modulate the model's capabilities. The more parameters an LLM has, the better it can interpret nuances and complex relationships between words. A model with few parameters might simply state that \"Paris is a city in France,\" while a more sophisticated model could also incorporate information about Paris's history, culture, or geography.</p></li><li><p>Data plays an equally crucial role. LLMs are trained on vast quantities of text from diverse sources: scientific articles, books, online discussions, and more. Through this training, the model learns to recognize the relationships and meanings behind words, as if it had read every encyclopedia, personal letter, and recipe book ever written.</p></li></ul><div data-claire-semantic=\"question\"><p>What exactly happens when I ask a question to an LLM?</p></div><p>Here's what happens:</p><ul><li><p><strong>Deciphering the question</strong><br />The model starts by \"reading\" the question text sequentially, much like a person following a recipe. It breaks the sentence down into elementary units (called tokens) and identifies the links between them. For example, associating \"documents\" and \"marriage\" helps place the context in the administrative domain. This step lets the model determine what type of answer is expected (a list, an explanation, etc.).</p></li><li><p><strong>Activating statistical memory</strong><br />Rather than querying a database, the LLM draws on statistical memory acquired during its training on countless texts. For a question like \"What documents do I need to get married?\", it activates familiar patterns: a government-issued ID is typically required, a birth certificate is associated with civil status, and so on.</p></li><li><p><strong>Incremental answer generation</strong><br />The answer is built word by word, progressively, anticipating at each step what the next most likely continuation should be.</p></li></ul><ul><li><p><strong>First step</strong>: The model begins by generating an opening phrase — for example, \"You will need a...\". At this point, it evaluates several possible continuations (such as \"government-issued ID,\" \"photo,\" or \"signed authorization\").</p></li><li><p><strong>Next step</strong>: From the completed opening phrase (\"You will need a government-issued ID, a...\"), it predicts the most contextually coherent word (for example, \"proof of address,\" \"certificate,\" etc.).<br />This process repeats until the answer is complete or a technical limit is reached.</p></li></ul><ul><li><p><strong>Real-time filtering and adjustment</strong><br />In parallel, filtering mechanisms intervene to prevent generating incoherent or inappropriate answers. For example, if the probability of producing an out-of-context continuation (such as \"a bouquet of flowers\") is very low, that option is excluded.</p></li></ul><div><aside data-claire-semantic=\"information\"><p>Imagine a gigantic autocomplete engine, trained on every library in the world. The LLM doesn't \"think\" — it assembles linguistic patterns statistically, like a chef mixing familiar ingredients to create a new dish. We call these linguistic units tokens. Let's find out what they are!</p></aside></div><h4>Understand why an LLM uses tokens</h4><p>Language models use tokens because they don't process text directly the way humans do. Unlike us, who understand sentences holistically, an LLM must convert language into a numerical representation it can manipulate. Tokenization enables this conversion by dividing text into smaller units (tokens), which are then transformed into numbers and processed by the model.</p><p>This approach has several advantages:</p><ul><li><p>Rather than storing every word in a language, LLMs use a limited set of tokens, making it possible to handle diverse languages and unknown words.</p></li><li><p>Working with tokens improves model efficiency by limiting the volume of information to process.</p></li><li><p>By breaking words into sub-units (like \"lib\" and \"rary\"), an LLM can recognize and understand words it has never encountered before.</p></li></ul><h4>See how an LLM uses tokens</h4><p>Several steps occur in sequence when we run an LLM:</p><ol><li><p>When text is submitted to the model, it is first divided into tokens. A token can be a whole word, part of a word, or even a single character, depending on the tokenization method used.</p></li><li><p>Each token is mapped to a unique identifier in a pre-established vocabulary. For example, the word \"cat\" might correspond to the number 3456.</p></li><li><p>These sequences of numbers are then analyzed by the LLM, which detects relationships between tokens through mechanisms like neural networks and attention (Transformer).</p></li><li><p>When the model generates an answer, it predicts the next token in the sequence and continues until a defined length is reached.</p></li><li><p>Finally, the token sequence is converted back into readable text through a reverse tokenization process.</p></li></ol><figure><img src=\"https://user.oc-static.com/upload/2025/04/11/17443575996203_P1C2-2.png\" alt=\"Diagram illustrating the steps of text processing by a language model, from the input 'The cats are cute.' to the enriched output 'The cats are cute and adorable.'\" /><figcaption>Diagram illustrating the steps of text processing by a language model</figcaption></figure><aside data-claire-semantic=\"information\"><p><a href=\"https://tiktokenizer.vercel.app/\">Tiktokenizer</a> lets you explore the tokenization process by entering text and watching how it gets divided into tokens. This is very useful when you need to calculate the total number of tokens generated — something LLMs can't yet do on their own.</p></aside><aside data-claire-semantic=\"warning\"><p>Despite their impressive capabilities, LLMs are not perfect. They can make errors — notably by inventing answers that seem true but are actually false, a phenomenon called \"hallucination.\" Additionally, since they're trained on human-generated data, they can reproduce biases present in that data, including stereotypes.</p></aside><p>Another challenge concerns their ability to handle limited context: if a question exceeds the maximum context window size, important information risks being overlooked. To address these limitations, it's essential to continuously test, adjust, and monitor these models.</p><p>To wrap up, LLMs function as ultra-fast, tireless assistants. They analyze words, predict answers word by word, and rely on an immense knowledge base. However, they remain imperfect and require careful supervision.</p><p>Think of it as a digital Josiane — capable of delivering accurate answers in an instant, but one who can also occasionally make mistakes or need a correction.</p><h4>Understand how an LLM works</h4><p>LLMs are built on artificial neural networks inspired by how the human brain works. These networks are made up of layers of interconnected neurons. Each connection between neurons has an associated weight. These weights are adjusted during training to enable the network to learn to recognize patterns in data. The networks used for LLMs are particularly large and complex, with billions of parameters (the weights of the connections).</p><p>Take the sentence: \"The pothole on Route D42, reported by farmer Dupont, will be repaired on Friday.\"</p><p>The attention mechanism detects that:</p><ul><li><p>\"pothole\" is linked to \"D42\" (location) and \"repaired\" (action).</p></li><li><p>\"Friday\" depends on \"reported\" (the time elapsed since the notification).</p></li></ul><p>This contextual analysis enables precise answers, such as: \"Repair work will begin on [date] according to the public works department.\"</p><p>Before performing these operations, the network must learn from large datasets.</p><p><strong> </strong></p><p>Two key phases: Training and inference</p><ul><li><p><strong>Training</strong>: An intensive phase where the model ingests terabytes of text. Over weeks, it adjusts its parameters to predict the missing word in sentences.</p></li></ul><aside data-claire-semantic=\"information\"><p>Today, we use nearly the entire web! That represents, after filtering, approximately 44 terabytes of data. To get a sense of what that looks like, check out <a href=\"https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1\">FineWeb</a>, a large-scale web corpus developed by Hugging Face.</p></aside><ul><li><p><strong>Inference:</strong> The everyday usage phase. When Josiane types a question, the LLM activates its frozen parameters to generate an answer. Think of it like a pianist playing a memorized piece — fast and polished, but without the ability to improvise something entirely new.</p></li></ul><p>However, training these models is extremely resource-intensive, both in terms of computing power and data. Additionally, their knowledge is frozen at the date of their training cutoff, meaning they cannot access newer information without additional enrichment. Despite these limitations, LLMs possess remarkable emergent capabilities, such as answering questions, summarizing text, and machine translation.</p><h4>Explore the Transformer architecture</h4><aside data-claire-semantic=\"information\"><p>Most modern LLMs use an architecture called <strong>Transformer</strong>, a key innovation that appeared in 2017 (<a href=\"https://arxiv.org/abs/1706.03762\">source</a>) that radically transformed the field of natural language processing (NLP).</p></aside><p>Transformers are based on a central mechanism: <strong>attention</strong>. Unlike sequential approaches that process words one at a time, attention allows the model to examine an entire text sequence simultaneously. Each word can thus \"look at\" all other words in the sentence to identify which ones are most relevant. This ability to evaluate all possible relationships between words significantly improves contextual understanding.</p><p>Transformers consist of two main parts:</p><ul><li><p><strong>The encoder</strong>: processes the input text.</p></li><li><p><strong>The decoder</strong>: generates the output text.<br />Models like those in the GPT family use only the decoder portion to produce text.</p></li></ul><figure><img src=\"https://user.oc-static.com/upload/2025/04/11/17443577406193_P1C2-3.png\" alt=\"Diagram of a Transformer model showing the data flow: the input passes through an encoder, then a decoder, to produce an output.\" /><figcaption>How Transformers work</figcaption></figure><p>The attention mechanism works in three main steps:</p><ol><li><p>Computing queries, keys, and values: For each word in a sequence, the model creates three vector representations:</p></li></ol><ul><li><p>Q (Query): What the word is \"searching for\" in the sequence</p></li><li><p>K (Key): What identifies the word</p></li><li><p>V (Value): The actual information the word contains</p></li></ul><p>Computing attention scores: For each position in the sequence, the model calculates scores indicating how much each word should \"pay attention\" to every other word:</p><ul><li><p>It computes the dot product between the query (Q) of the current word and the keys (K) of all words</p></li><li><p>These scores are normalized by a softmax operation to obtain attention weights</p></li></ul><aside data-claire-semantic=\"information\"><p>Weighted aggregation: The model creates a new representation for each word by combining the values (V) of all words, weighted by the previously computed attention scores.</p></aside><p>This approach lets the model give more importance to certain words depending on context. For example, in the sentence \"The man who bought a red car parked it,\" the attention mechanism enables the model to understand that \"it\" refers to \"car\" rather than \"man\" by capturing the relationships between these words.</p><p>In the complete architecture, this attention mechanism is applied multiple times in parallel (multi-head attention) and across different layers, allowing the model to capture increasingly complex relationships between words.</p><div><aside data-claire-semantic=\"information\"><p>Dive deep into how the Transformer architecture works with this <a href=\"https://ig.ft.com/generative-ai/\">article</a> from the Financial Times. You can also look under the hood of nano-GPT: <a href=\"https://bbycroft.net/llm\">LLM Visualization</a></p></aside><p>Transformers have transformed NLP for several major reasons:</p></div><ol><li><div><p><strong>Parallelization and efficiency</strong><br />Unlike sequential models such as recurrent neural networks (RNNs) or LSTMs, Transformers process the entire sequence simultaneously. This enables efficient parallelization during training, drastically reducing compute time and making it feasible to train on very large datasets.</p></div></li><li><div><p><strong>Managing long-range dependencies</strong><br />The attention mechanism captures complex relationships between words that are far apart in a sentence. While sequential models struggle to retain information over long distances, Transformers directly evaluate the importance of each word relative to all others, improving contextual understanding.</p></div></li><li><div><p><strong>Scalability and improved performance</strong><br />This modular architecture has made it possible to develop increasingly large models (such as GPT, BERT, etc.) capable of handling a wide variety of tasks with remarkable accuracy, from machine translation to text summarization. The ability to incorporate extended contexts and adapt to diverse problems has opened the door to a new generation of NLP applications.</p></div></li></ol><h4>Adapt your LLM to your use case</h4><p>To adapt a Large Language Model (LLM) to the specific needs of a city hall like Trifouillis-sur-Loire, it's important to explore several approaches to optimize both the relevance and efficiency of answers. <strong>Prompt engineering</strong> and <strong>fine-tuning</strong> are two classic techniques for customizing language models. However, their respective limitations — sometimes insufficient effectiveness for prompting and high cost (plus inflexibility) for fine-tuning — lead us to consider a complementary alternative: <strong>RAG (Retrieval-Augmented Generation)</strong>.</p><h4>Design effective instructions with prompt engineering</h4><p>Prompt engineering means crafting and optimizing the text instructions you provide to the LLM. When well-designed, these instructions produce relevant answers <strong>without modifying the model itself</strong>. This approach is especially useful in a government-services context, where the questions people ask vary enormously.</p><div data-claire-semantic=\"question\"><p>What is a prompt?</p></div><p>A <strong>prompt</strong> is an instruction or question given to the LLM. The quality of the prompt directly influences the relevance and accuracy of the answer. For example:</p><ul><li><p>General prompt: <em>\"What documents are needed to get married?\"</em></p></li><li><p>Contextual, precise prompt: <em>\"What documents are required for a civil marriage at the Trifouillis-sur-Loire city hall?\"</em></p></li></ul><p>Here are some key principles for an effective prompt:</p><p><strong>1. Precision:</strong></p><ul><li><p>Use specific terms.</p></li><li><p>Example: <em>\"Provide a list of required documents for a civil marriage in the United States.\"</em></p></li></ul><p><strong>2. Context:</strong></p><ul><li><p>Add details to anchor the answer in a specific situation.</p></li><li><p>Example: <em>\"For a civil marriage at a small city hall like Trifouillis-sur-Loire, what documents are required?\"</em></p></li></ul><p><strong>3. Actionability:</strong></p><ul><li><p>Structure the prompt to encourage the model to give a clear, actionable answer.</p></li><li><p>Example: <em>\"List the steps to follow to file a birth registration at the city hall.\"</em></p></li></ul><p><strong>4. Iteration:</strong></p><ul><li><p>Test different phrasings to find the most effective one.</p></li></ul><aside data-claire-semantic=\"information\"><p>Common techniques:</p><ul><li><p><strong>Zero-Shot Prompting</strong>: Get an answer without providing examples.</p></li><li><p><strong>Few-Shot Prompting</strong>: Guide the model by providing a few examples.</p></li><li><p><strong>Chain-of-Thought Prompting</strong>: Encourage step-by-step reasoning.</p></li></ul></aside><p>Although this method is quick and doesn't require modifying the model, it has notable limitations — particularly around access to the organization's proprietary or internal information. The model simply cannot draw from that internal data, which limits its ability to provide truly contextualized answers.</p><h4>Adapt the LLM to local specifics with fine-tuning</h4><p><strong>Fine-tuning</strong> means retraining a pre-trained LLM on specific data so it can respond more accurately to particular needs. This can include administrative procedures, local information, or regulations specific to a given organization.</p><div><div data-claire-semantic=\"question\"><p>Why might fine-tuning be a good fit for a city hall?</p></div></div><p>At first glance, you might think it would be useful for two reasons:</p><ul><li><p><strong>Local specialization:</strong> General-purpose LLMs often lack data on local regulations and procedures.</p></li><li><p><strong>Style and tone improvement:</strong> Fine-tuning can help the model adopt a formal, courteous administrative tone, as expected in a city hall context.</p></li></ul><p>For example:</p><ul><li><p>Before fine-tuning: \"What documents do I need to get married?\" (Generic answer, sometimes incorrect).</p></li><li><p>After fine-tuning: \"At Trifouillis-sur-Loire, you must provide a government-issued ID, a proof of address less than 3 months old, and a certified copy of your birth certificate.\"</p></li></ul><aside data-claire-semantic=\"warning\"><p>While very effective for certain use cases, fine-tuning comes with major drawbacks:</p><p><strong>1. Cost and complexity:</strong></p><ul><li><p>Full fine-tuning requires significant computing resources and data. It can be cost-prohibitive for small organizations.</p></li></ul><p><strong>2. Lack of flexibility:</strong></p><ul><li><p>Once fine-tuned, the model becomes less general-purpose and may answer incorrectly when asked questions outside its training domain.</p></li><li><p>Example: After fine-tuning on Trifouillis-sur-Loire's local procedures, the model might fail to correctly answer questions about other regions or jurisdictions.</p></li></ul><p><strong>3. Difficult updates:</strong></p><ul><li><p>Administrative information changes regularly (for example, new forms, changes in regulations). Updating a fine-tuned model requires restarting the entire training process, which is time-consuming and expensive.</p></li></ul></aside><h4>Understand the usefulness of a RAG</h4><p>Given the limitations of prompt engineering and fine-tuning, we've opted for a hybrid approach based on <strong>RAG (Retrieval-Augmented Generation)</strong>. This method combines an LLM's generative capability with real-time access to an external knowledge base to deliver enriched, relevant answers.</p><ul><li><p><strong>Retrieval</strong>: searching for relevant data</p></li><li><p><strong>Augmented</strong>: adding that data as context to the prompt</p></li><li><p><strong>Generation</strong>: using the augmented prompt with an LLM to generate content</p></li></ul><p>Here are the key steps of how it works:</p><figure><img src=\"https://user.oc-static.com/upload/2025/04/11/17443579708058_P1C2-4.png\" alt=\"Diagram illustrating how a RAG system works: a corpus is vectorized and stored, then queried by an LLM via similarity search to generate an answer with sources.\" /><figcaption>How a RAG system works</figcaption></figure><p>This workflow unfolds in 5 main steps:</p><ol><li><p><strong>Corpus</strong>: Collect the text documents or information sources to analyze.</p></li><li><p><strong>Chunking</strong>: Break documents into smaller units (chunks) for more efficient management and analysis.</p></li><li><p><strong>Vectorization</strong>: Convert chunks into numerical vectors — mathematical representations of content in a multidimensional space.</p></li><li><p><strong>Indexing</strong>: Organize vectors in a vector database to enable fast search and retrieval of relevant information.</p></li><li><p><strong>Vector database query</strong>: Query the vector database to identify the documents most relevant to a given question or need.</p></li></ol><h4>Key takeaways</h4><ul><li><p>LLMs, trained on immense text corpora, can generate coherent answers and simulate human-like interactions.</p></li><li><p>Their knowledge is frozen at their training cutoff date, making them unable to incorporate more recent information.</p></li><li><p>These models can lack relevance when faced with specific or local requests, limiting their usefulness in precise contexts.</p></li><li><p>Without adjustments, they risk producing general or incomplete answers that are inadequate for tasks requiring higher precision.</p></li><li><p>These limitations drive the need for solutions like RAG, which is covered in depth throughout this course.</p></li></ul><p><em>Now that you know more about the usefulness of a RAG, let's move on to the next chapter to prepare your data.</em></p>",
  "decision_log": [
    {
      "segment_id": "S-001",
      "source_text": "Vous utilisez un modèle de langage, mais ses réponses sont parfois erronées ou inventées ?",
      "draft_input": "You're using a language model, but its responses are sometimes incorrect or invented?",
      "final_output": "You're using a language model, but its responses are sometimes incorrect or made up?",
      "change_type": "lexical_naturalness",
      "decision_note": "'Made up' is more natural in US conversational English than 'invented' for this context."
    },
    {
      "segment_id": "S-002",
      "source_text": "Introduction (h4 heading)",
      "draft_input": "<h4>Introduction</h4>",
      "final_output": "<h4>Get started</h4>",
      "change_type": "oc_style_imperative_title",
      "decision_note": "OC style requires all h4 headings to use imperative form. 'Introduction' is a nominal label. 'Get started' matches the intent of the section (orienting the learner before the course body) while satisfying the imperative requirement."
    },
    {
      "segment_id": "S-003",
      "source_text": "Ce cours est conçu pour vous guider dans la mise en place d'un système RAG, directement applicable selon votre contexte.",
      "draft_input": "This course is designed to guide you in implementing a RAG system, directly applicable to your context.",
      "final_output": "This course is designed to guide you in implementing a RAG system, directly applicable to your context.",
      "change_type": "no_change",
      "decision_note": "Correct as drafted."
    },
    {
      "segment_id": "S-004",
      "source_text": "Que vous soyez responsable technique, développeur ou gestionnaire de projet",
      "draft_input": "Whether you're a technical manager, developer, or project manager",
      "final_output": "Whether you're a technical manager, developer, or project manager",
      "change_type": "no_change",
      "decision_note": "Correct and inclusive (role list is gender-neutral in context)."
    },
    {
      "segment_id": "S-005",
      "source_text": "La pédagogie active m'a permis de découvrir une nouvelle passion",
      "draft_input": "Active pedagogy allowed me to discover a new passion",
      "final_output": "Active learning allowed me to discover a new passion",
      "change_type": "terminology_brand",
      "decision_note": "'Active learning' is the standard OC brand term in English. 'Active pedagogy' is a direct Gallicism not used in en-US educational contexts."
    },
    {
      "segment_id": "S-006",
      "source_text": "jamais je n'aurais soupçonné que je puisse avoir l'occasion de travailler sur de tels sujets",
      "draft_input": "I never would have suspected I'd have the opportunity to work on such subjects.",
      "final_output": "I never would have imagined I'd have the opportunity to work on topics like these.",
      "change_type": "style_tone",
      "decision_note": "'Imagined' is more natural than 'suspected' in US English for this expression of surprise. 'Topics like these' is more idiomatic than 'such subjects'."
    },
    {
      "segment_id": "S-007",
      "source_text": "Découvrez le projet fil rouge du cours (h4)",
      "draft_input": "<h4>Discover the course's main project</h4>",
      "final_output": "<h4>Discover the course's guiding project</h4>",
      "change_type": "cultural_concept_swap_forbidden_term",
      "decision_note": "'Fil rouge' is a forbidden term. 'Guiding project' correctly conveys the through-line narrative concept without using the Gallicism. 'Main project' in the draft lost this nuance."
    },
    {
      "segment_id": "S-008",
      "source_text": "Le projet fil rouge de ce cours vous invite à concevoir un système RAG",
      "draft_input": "The main project for this course invites you to design a RAG system",
      "final_output": "The guiding project for this course invites you to design a RAG system",
      "change_type": "cultural_concept_swap_forbidden_term",
      "decision_note": "Parallel consistency fix with S-007. 'Guiding project' replaces 'main project' for accurate concept transfer."
    },
    {
      "segment_id": "S-009",
      "source_text": "vous serez guidé dans la création d'une base vectorielle",
      "draft_input": "you'll be guided in creating a vector base",
      "final_output": "you'll be guided in creating a vector database",
      "change_type": "terminology_consistency",
      "decision_note": "'Vector database' is the established domain term used consistently throughout the course. 'Vector base' is non-standard."
    },
    {
      "segment_id": "S-010",
      "source_text": "Josiane, l'agent d'accueil",
      "draft_input": "Josiane, the reception agent",
      "final_output": "Josiane, the front-desk agent",
      "change_type": "cultural_concept_swap",
      "decision_note": "'Front-desk agent' is the standard US equivalent for a public-service welcome/reception desk role."
    },
    {
      "segment_id": "S-011",
      "source_text": "Comment obtenir une subvention pour une rénovation énergétique ?",
      "draft_input": "How do I get a subsidy for energy renovation?",
      "final_output": "How do I apply for a grant for an energy-efficiency renovation?",
      "change_type": "cultural_concept_swap",
      "decision_note": "'Grant' is the standard US public-funding equivalent for 'subvention'. 'Apply for' is the natural verb collocation. 'Energy-efficiency renovation' is the standard US phrasing."
    },
    {
      "segment_id": "S-012",
      "source_text": "Avec des classeurs encombrants et des fichiers Excel capricieux",
      "draft_input": "With bulky filing cabinets and temperamental Excel files",
      "final_output": "With bulky binders and temperamental spreadsheets",
      "change_type": "cultural_concept_swap",
      "decision_note": "'Classeurs' in a French administrative office context = ring binders, not filing cabinets. 'Spreadsheets' is tool-neutral and more natural US phrasing than 'Excel files'."
    },
    {
      "segment_id": "S-013",
      "source_text": "Missionné pour révolutionner cette petite mairie",
      "draft_input": "Tasked with revolutionizing this small city hall",
      "final_output": "Tasked with modernizing this city hall",
      "change_type": "style_tone",
      "decision_note": "'Modernizing' is more realistic and less hyperbolic in a US professional context. 'Small' is redundant since the narrative context already establishes this."
    },
    {
      "segment_id": "S-014",
      "source_text": "# Déterminer l'appareil à utiliser (GPU si disponible)",
      "draft_input": "# Determine the device to use (GPU if available)",
      "final_output": "# Determine the device to use (GPU if available)",
      "change_type": "no_change",
      "decision_note": "Code comment correctly translated in imperative convention."
    },
    {
      "segment_id": "S-015",
      "source_text": "# Preprocessing de l'input utilisateur",
      "draft_input": "# Preprocessing of user input",
      "final_output": "# Preprocess user input",
      "change_type": "style_code_comment",
      "decision_note": "Python code comments conventionally use imperative verb form ('Preprocess' not 'Preprocessing of')."
    },
    {
      "segment_id": "S-016",
      "source_text": "# Chargement du modèle",
      "draft_input": "# Load the model",
      "final_output": "# Load the model",
      "change_type": "no_change",
      "decision_note": "Correctly translated in imperative convention."
    },
    {
      "segment_id": "S-017",
      "source_text": "# Prédiction du modèle",
      "draft_input": "# Model prediction",
      "final_output": "# Model prediction",
      "change_type": "no_change",
      "decision_note": "Acceptable nominal form for this comment; both 'Model prediction' and 'Run model prediction' are standard in Python notebooks."
    },
    {
      "segment_id": "S-018",
      "source_text": "Quel est ce programme que nous venons d'utiliser ? Schématiquement, nous pouvons simplement traduire l'opération effectuée comme cela :",
      "draft_input": "What is this program we just used? Schematically, we can translate the operation performed like this:",
      "final_output": "What is this program we just used? Simply put, we can describe the operation performed like this:",
      "change_type": "cultural_portability_lexical",
      "decision_note": "'Schematically' is a Gallicism (calque of 'schématiquement'). US English does not use 'schematically' in this discourse-marker sense. 'Simply put' is the idiomatic US equivalent for introducing a simplified explanation."
    },
    {
      "segment_id": "S-019",
      "source_text": "Schéma illustrant le fonctionnement d'un LLM (alt text)",
      "draft_input": "Schema illustrating how an LLM works: a question as input is processed in multiple steps to produce a text answer as output.",
      "final_output": "Diagram illustrating how an LLM works: a question as input is processed in multiple steps to produce a text answer as output.",
      "change_type": "cultural_portability_lexical",
      "decision_note": "'Schema' is a Gallicism in this descriptive alt-text context. US English uses 'Diagram' for explanatory visual figures."
    },
    {
      "segment_id": "S-020",
      "source_text": "Schéma illustrant le fonctionnement d'un LLM (figcaption)",
      "draft_input": "Schema illustrating how an LLM works",
      "final_output": "Diagram illustrating how an LLM works",
      "change_type": "cultural_portability_lexical",
      "decision_note": "Parallel Gallicism fix for figcaption, consistent with S-019."
    },
    {
      "segment_id": "S-021",
      "source_text": "Le cœur d'un LLM : les paramètres et les données (h4)",
      "draft_input": "<h4>The heart of an LLM: parameters and data</h4>",
      "final_output": "<h4>Explore the heart of an LLM: parameters and data</h4>",
      "change_type": "oc_style_imperative_title",
      "decision_note": "OC style requires imperative h4 headings. 'Explore' converts the nominal title to imperative while preserving the meaning."
    },
    {
      "segment_id": "S-022",
      "source_text": "Les paramètres agissent comme des boutons ajustables",
      "draft_input": "Parameters act like adjustable buttons that modulate the model's capabilities.",
      "final_output": "Parameters act like adjustable dials that modulate the model's capabilities.",
      "change_type": "cultural_portability_lexical",
      "decision_note": "'Dials' is more idiomatic than 'buttons' in US English for the metaphor of fine-grained, incremental adjustment in technical writing."
    },
    {
      "segment_id": "S-023",
      "source_text": "comme s'il avait lu toutes les encyclopédies et même des lettres personnelles ou des recettes de cuisine",
      "draft_input": "as if it had read all the encyclopedias as well as personal letters or cooking recipes",
      "final_output": "as if it had read every encyclopedia, personal letter, and recipe book ever written",
      "change_type": "style_tone",
      "decision_note": "More vivid and idiomatic phrasing in US English; serial list with 'every... ever written' creates stronger rhetorical effect matching the source register."
    },
    {
      "segment_id": "S-024",
      "source_text": "Pour une question telle que « Quels documents pour un mariage ? », il active des schémas habituels : la pièce d'identité est souvent demandée, l'acte de naissance est associé à l'état civil",
      "draft_input": "For a question like \"What documents do I need to get married?\", it activates familiar patterns: a government-issued ID is typically required, a birth certificate is associated with civil status",
      "final_output": "For a question like \"What documents do I need to get married?\", it activates familiar patterns: a government-issued ID is typically required, a birth certificate is associated with civil status",
      "change_type": "no_change",
      "decision_note": "Correctly translated. pièce d'identité → government-issued ID; acte de naissance → birth certificate; état civil → civil status. French guillemets replaced with US double quotes."
    },
    {
      "segment_id": "S-025",
      "source_text": "Pourquoi un LLM utilise des tokens ? (h4)",
      "draft_input": "<h4>Why does an LLM use tokens?</h4>",
      "final_output": "<h4>Understand why an LLM uses tokens</h4>",
      "change_type": "oc_style_imperative_title",
      "decision_note": "Interrogative headings violate OC imperative-title rule. 'Understand why' converts to imperative while preserving the explanatory intent."
    },
    {
      "segment_id": "S-026",
      "source_text": "Comment un LLM utilise des tokens ? (h4)",
      "draft_input": "<h4>How does an LLM use tokens?</h4>",
      "final_output": "<h4>See how an LLM uses tokens</h4>",
      "change_type": "oc_style_imperative_title",
      "decision_note": "Interrogative heading converted to imperative. 'See how' introduces the walkthrough register appropriate for a process explanation section."
    },
    {
      "segment_id": "S-027",
      "source_text": "En divisant les mots en sous-unités (comme \"biblio\" et \"thèque\")",
      "draft_input": "By breaking words into sub-units (like \"lib\" and \"rary\")",
      "final_output": "By breaking words into sub-units (like \"lib\" and \"rary\")",
      "change_type": "no_change",
      "decision_note": "Correct cultural swap: French example 'bibliothèque' split as biblio/thèque replaced with English 'library' split as lib/rary to illustrate the same tokenization concept."
    },
    {
      "segment_id": "S-028",
      "source_text": "Diagramme illustrant les étapes de traitement d'un texte par un modèle de langage (alt text / figcaption)",
      "draft_input": "Diagram illustrating the steps of text processing by a language model, from the input 'The cats are cute.' to the enriched output 'The cats are cute and adorable.'",
      "final_output": "Diagram illustrating the steps of text processing by a language model, from the input 'The cats are cute.' to the enriched output 'The cats are cute and adorable.'",
      "change_type": "no_change",
      "decision_note": "Correctly translated. 'Diagram' appropriately used. Input/output example sentences adapted to English."
    },
    {
      "segment_id": "S-029",
      "source_text": "En résumé, les LLM fonctionnent comme des assistants ultra-rapides et infatigables. (body sentence)",
      "draft_input": "In summary, LLMs function as ultra-fast, tireless assistants.",
      "final_output": "To wrap up, LLMs function as ultra-fast, tireless assistants.",
      "change_type": "forbidden_term_replacement",
      "decision_note": "FORBIDDEN TERM resolved: 'In summary' is a direct translation of 'En résumé'. Per style rules, replaced with 'To wrap up'."
    },
    {
      "segment_id": "S-030",
      "source_text": "En résumé (h4 heading)",
      "draft_input": "<h4>In summary </h4>",
      "final_output": "<h4>Key takeaways</h4>",
      "change_type": "forbidden_term_replacement",
      "decision_note": "FORBIDDEN TERM resolved: 'In summary' heading is a direct translation of 'En résumé'. Per style rules, replaced with 'Key takeaways'. Trailing whitespace inside tag also removed."
    },
    {
      "segment_id": "S-031",
      "source_text": "L'architecture transformers (h4)",
      "draft_input": "<h4>The Transformer architecture</h4>",
      "final_output": "<h4>Explore the Transformer architecture</h4>",
      "change_type": "oc_style_imperative_title",
      "decision_note": "Nominal h4 title converted to imperative with 'Explore'. Capitalisation of 'Transformer' retained as it is a proper noun in the NLP domain."
    },
    {
      "segment_id": "S-