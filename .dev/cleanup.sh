#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(realpath "$SCRIPT_DIR/../")"

FILES=(".nuxt" ".output" "node_modules" ".config/certs" ".config/db" ".config/redis")

is_sudo_installed() {
    command -v sudo > /dev/null 2>&1
}

if [ "$EUID" -eq 0 ]; then
    SUDO=""
else
    if is_sudo_installed; then
        SUDO="sudo"
    else
        echo "Error: 'sudo' is not installed, and you are not running as root."
        exit 1
    fi
fi

echo "The following files/directories will be deleted (from $TARGET_DIR):"
echo "------------------------------------------------"
for file in "${FILES[@]}"; do
    echo "- $file"
done
echo "------------------------------------------------"

read -p "Are you sure you want to delete these files and run 'docker compose down -v'? (y/N): " CONFIRMATION

if [[ "$CONFIRMATION" == "y" ]]; then
    echo "Deleting files..."
    for file in "${FILES[@]}"; do
        FULL_PATH="$TARGET_DIR/$file"
        if [ -e "$FULL_PATH" ]; then
            $SUDO rm -rf "$FULL_PATH"
            echo "Deleted: $FULL_PATH"
        else
            echo "Skipped: $FULL_PATH (not found)"
        fi
    done

    echo "Running 'docker compose down -v' in $TARGET_DIR..."
    (cd "$TARGET_DIR" && docker compose down -v)

    echo "Operation complete."
else
    echo "Operation canceled."
fi

exit 0
