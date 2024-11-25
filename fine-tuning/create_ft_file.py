
import json
import os

data = [
    
]

dirname = "../shakespeare_split"



directory = os.fsencode(dirname)
    
for file in os.listdir(directory):
    filename = dirname + os.sep + os.fsdecode(file)
    print ("Reading " + filename)
    
    
 
    infile = open(filename, "r") # open file e.g. "s1" for read

    newentry =  {
            "messages": [
               
                {"role": "assistant", "content": infile.read()}
            ]
    }

    infile.close()
    data.append(newentry)


# Define the data


# Write data to a .jsonl file
with open('output.jsonl', 'w') as f:
    for entry in data:
        f.write(json.dumps(entry) + '\n')

print("JSONL file has been written.")
