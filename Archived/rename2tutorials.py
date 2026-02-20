import os
import re

# Set your target directory
folder_path = r"D:\Projects\QRSNTU\Notes\MH1101\MH1101 - Calculus II - Tutorials (AY25-26)"

# SAFETY SWITCH: Set to False only when you are ready to actually rename the files
dry_run = False


def main():
    # 1. Get all PDF files in the directory
    try:
        files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
    except FileNotFoundError:
        print(f"Error: The directory '{folder_path}' was not found.")
        return

    # 2. Extract the number inside the parentheses for accurate sorting
    def extract_number(filename):
        # Looks for numbers inside parentheses, e.g., "(2)"
        match = re.search(r'\((\d+)\)', filename)
        if match:
            return int(match.group(1))
        return float('inf')  # If no number is found, push to the end of the list

    # 3. Sort files numerically based on the extracted number
    files.sort(key=extract_number)

    # 4. Loop through and rename sequentially
    print("--- Planned Renaming Process ---")
    for index, filename in enumerate(files, start=1):
        old_path = os.path.join(folder_path, filename)

        # Construct the new filename
        new_filename = f"MH1101_CalculusII_25-26_Sem1_Tutorials_Tutorial {index}_Solution by QRS.pdf"
        new_path = os.path.join(folder_path, new_filename)

        if dry_run:
            print(f"Would rename: \n'{filename}' \n-> '{new_filename}'\n")
        else:
            os.rename(old_path, new_path)
            print(f"Renamed: '{filename}' -> '{new_filename}'")

    if dry_run:
        print("--- DRY RUN COMPLETE ---")
        print("Change `dry_run = False` in the code to actually rename the files.")


if __name__ == "__main__":
    main()