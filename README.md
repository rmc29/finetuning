Evaluating a fine-tuned LLM with Okareo
=======================================

* Download complete works of Shakespeare from Gutenberg https://www.gutenberg.org/ebooks/100
* Manually delete front and end matter and divide into 3 sections: [plays](plays.txt), [sonnets](sonnets.txt), and [other verse](verse.txt)
* Use [split_shakespeare script](split_shakespeare.py) to split into lots of individual sections
* Use [create_ft_file script](validation/create_ft_file.py) to convert to JSONL
* Use [validation script from OpenAI](finetuning/validation.py) to validate JSONL file (from https://cookbook.openai.com/examples/chat_finetuning_data_prep)


* Use
```
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="fine-tune" \
  -F file="@output.jsonl"
```
to upload JSONL file to OpenAI (see https://platform.openai.com/docs/api-reference/files/create)

* Use
```
curl https://api.openai.com/v1/fine_tuning/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "training_file": YOUR_FILE_ID,
    "model": "gpt-3.5-turbo-0125"
  }'
```
to fine-tune (see https://platform.openai.com/docs/api-reference/fine-tuning). Model ID is the same as in the Okareo flow; file ID is what was returned from the previous step.

* Then use `okareo run -f ft1` to run the evaluation.
