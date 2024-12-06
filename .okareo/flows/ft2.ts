import { 
	Okareo, 
	RunTestProps, 
	components,
	SeedData,
    TestRunType, 
    OpenAIModel,
	CheckOutputType,
    GenerationReporter,
	UploadEvaluatorProps,
} from "okareo-ts-sdk";
//import { CHECK_TYPE, register_checks } from '../tests/utils/check_utils';


import * as core from "@actions/core";

const OKAREO_API_KEY = process.env.OKAREO_API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const UNIQUE_BUILD_ID = `local.${Date.now()}`;

const PROJECT_NAME = "Global";
const SCENARIO_SET_NAME = "Questions for LLM text generation";
const USER_PROMPT_TEMPLATE = "{scenario_input}"
//const SYSTEM_PROMPT_TEMPLATE = "Answer the following question."

const BASE_MODEL_NAME = "Base Text Generator";
const FINE_TUNED_MODEL_NAME = "Fine-Tuned Text Generator";

 type CHECK_TYPE = {
    name: string;
    description: string;
    prompt?: string;
    output_data_type: string;
    requires_scenario_input?: boolean;
    requires_scenario_result?: boolean;
    update?: boolean;
}


const register_checks = async (okareo: Okareo, project_id: string, required_checks: CHECK_TYPE[]): Promise<any> => {
    const checks = await okareo.get_all_checks();
    try {
        for (const demo_check of required_checks) {            
            
			console.log(`Creating Check ${demo_check.name}.`);
			const new_check = await addCheck(okareo, project_id, demo_check);
			console.log(`Check ${demo_check.name} has been created and is now available.`);
           
        }
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Error registering checks: ${e.message}`);
        } else {
            throw e;
        }
    }
    return Promise.resolve();
}

const addCheck = async (okareo: Okareo, project_id: string, check: CHECK_TYPE): Promise<components["schemas"]["EvaluatorDetailedResponse"]> => {
    try {
        let check_config: any;
        if (!check.prompt) {
            const check_primitive = await okareo.generate_check({  
                project_id,
                ...check
            });
            if (check_primitive.generated_code && check_primitive.generated_code.length > 0) {
                check_config = {
                    code_contents: check_primitive.generated_code,
                    type: check.output_data_type,
                };
            }
        } else {
            check_config = {
                prompt_template: check.prompt,
                type: check.output_data_type,
            };
        }
            
        return await okareo.create_or_update_check({
            project_id,
            name: check.name,
            description: check.description,
            check_config,
        });
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`${check.name}: Failed to upload check ${e.message}`);
        } else {
            throw e;
        }

    }
}



const main = async () => {
	try {
		const okareo = new Okareo({api_key: OKAREO_API_KEY });
		const project: any[] = await okareo.getProjects();
		const project_id = project.find(p => p.name === PROJECT_NAME)?.id;

        // create scenario set
        const TEST_SEED_DATA = [
		    SeedData({
		        input:"How do I boil an egg?",  
		        result:"" //we're doing reference-free metrics so we don't need to supply an example result
		    }),
		    SeedData({
		        input:"Why is the sky blue?",  
		        result:""
		    }),
			 SeedData({
		        input:"Write a letter explaining why you cannot attend a wedding.",  
		        result:""
		    }),
			 SeedData({
		        input:"Write a message praising someone's positive qualities.",  
		        result:""
		    }),
		    SeedData({
		        input:"What are the main anatomical features of a flower and what are they for?", 
		        result:""
		    })
		];

        const scenario: any = await okareo.create_scenario_set(
            {
            	name: `${SCENARIO_SET_NAME} Scenario Set - ${UNIQUE_BUILD_ID}`,
            	project_id: project_id,
	            seed_data: TEST_SEED_DATA
            }
        );

        

	    const model = await okareo.register_model({
			name: BASE_MODEL_NAME,
			tags: [`Build:${UNIQUE_BUILD_ID}`],
			project_id: project_id,
			models: {
				type: "openai",
				model_id:"gpt-3.5-turbo-0125",
				temperature:0.5,
				user_prompt_template:USER_PROMPT_TEMPLATE,
			} as OpenAIModel,
			update: true,
		});
		
		const ftmodel = await okareo.register_model({
			name: FINE_TUNED_MODEL_NAME,
			tags: [`Build:${UNIQUE_BUILD_ID}`],
			project_id: project_id,
			models: {
				type: "openai",
				model_id:"ft:gpt-3.5-turbo-0125:wizard-on-demand::AXSgdIHf",
				temperature:0.5,
				//system_prompt_template:SYSTEM_PROMPT_TEMPLATE,
				user_prompt_template:USER_PROMPT_TEMPLATE,
			} as OpenAIModel,
			update: true,
		});
		
		//define new custom checks (by prompting an LLM judge)
		const custom_checks: CHECK_TYPE[] = [
				
				
				{
					name:"custom.Archaic.fewshot", 
					description: "Use LLM-as-a-judge to rate how archaic the output is.",
					prompt: "Output a score for how archaic the writing style is, on a scale of 1 (most modern) to 5 (most archaic). \
							Example 1 model answer: \
							The sky appears blue because of the way sunlight interacts with Earth's atmosphere. When sunlight reaches Earth, it is made up of a spectrum of colors, with shorter wavelengths like blue and violet being scattered more easily by the gases and particles in the atmosphere. This scattering causes the blue light to be more visible to our eyes, giving the sky its blue color. \
							Archaic Writing Style Score: 1 \
							Example 2 model answer: \
							Why is the sky blue? Why is the world \
							At endless strife with the spirit of man? \
							Why do the stars in their courses whirl, \
							And the planets and suns in their cycles plan \
							The doom of the earth and the fate of man? \
							Why is the sky blue? \
							Archaic Writing Style Score: 4 \
							Example 3 model answer: \
							{output} \
							Archaic Writing Style Score:",
					output_data_type: CheckOutputType.SCORE,
				},
				{
					name:"custom.Poetic.fewshot", 
					description: "Use LLM-as-a-judge to rate how poetic the output is. ",
					prompt: "Output a score for how poetic the writing style is, on a scale of 1 (most prosaic and ordinary) to 5 (most poetic). Poetic devices can include rhythm and meter, simile and metaphor, rhetorical questions, repetition, alliteration, elevated diction, and so on. \
					Example 1 model answer: \
							The sky appears blue because of the way sunlight interacts with Earth's atmosphere. When sunlight reaches Earth, it is made up of a spectrum of colors, with shorter wavelengths like blue and violet being scattered more easily by the gases and particles in the atmosphere. This scattering causes the blue light to be more visible to our eyes, giving the sky its blue color. \
							Poetic Writing Style Score: 1 \
							Example 2 model answer: \
							Why is the sky blue? Why is the world \
							At endless strife with the spirit of man? \
							Why do the stars in their courses whirl, \
							And the planets and suns in their cycles plan \
							The doom of the earth and the fate of man? \
							Why is the sky blue? \
							Poetic Writing Style Score: 5 \
							Example 3 model answer: \
							{output} \
							Poetic Writing Style Score:",
					output_data_type: CheckOutputType.SCORE,
				},
			];

			// register custom checks with Okareo
			register_checks(okareo, project_id, custom_checks);
			
			
			 // name the checks you will use with your evaluation
	        const checks = [
				
				"fluency_summary", // Okareo native check
				
				...custom_checks.map(c => c.name), // custom checks
			]

        // run LLM evaluation
		const base_eval_run: components["schemas"]["TestRunItem"] = await model.run_test({
			model_api_key: OPENAI_API_KEY,
			name: `${BASE_MODEL_NAME} Eval ${UNIQUE_BUILD_ID}`,
			tags: [`Build:${UNIQUE_BUILD_ID}`],
			project_id: project_id,
			scenario: scenario,
			calculate_metrics: true,
			type: TestRunType.NL_GENERATION,
			checks: checks
		} as RunTestProps);
		
		const ft_eval_run: components["schemas"]["TestRunItem"] = await ftmodel.run_test({
			model_api_key: OPENAI_API_KEY,
			name: `${FINE_TUNED_MODEL_NAME} Eval ${UNIQUE_BUILD_ID}`,
			tags: [`Build:${UNIQUE_BUILD_ID}`],
			project_id: project_id,
			scenario: scenario,
			calculate_metrics: true,
			type: TestRunType.NL_GENERATION,
			checks: checks
		} as RunTestProps);
		
		
		

	
		
		
		


		// reporting
		const report_definition = {
			metrics_min: {
				
				"fluency": 4.0,
				
			}
		};

		const base_reporter = new GenerationReporter({
				eval_run :base_eval_run, 
				...report_definition,
		});

		
		// Print a direct link to the evaluation report in Okareo (for convenience)
	console.log(`See base results in Okareo: ${base_eval_run.app_link}`);
	
	const ft_reporter = new GenerationReporter({
				eval_run :ft_eval_run, 
				...report_definition,
		});

		
		// Print a direct link to the evaluation report in Okareo (for convenience)
	console.log(`See fine-tuned results in Okareo: ${ft_eval_run.app_link}`);
		
		
	 } catch (error) {
		core.setFailed("Evaluation failed because: " + error.message);
	}
}
main();