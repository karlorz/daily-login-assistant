#!/bin/bash
# Archive unnecessary documentation files

set -e

ARCHIVE_DIR="docs/archive"
mkdir -p "$ARCHIVE_DIR"

echo "📦 Archiving unnecessary documentation files..."
echo ""

# Files to archive
files_to_archive=(
    "FORCE_SYSTEMD_IMPLEMENTATION.md"
    "FORCE_SYSTEMD_QUICK_REF.md"
    "SYSTEMD_NODE_FIX.md"
    "TEST_DEBUG_IMPROVEMENTS.md"
    "TEST_DIAGNOSIS.md"
    "TEST_SCRIPTS_COMPARISON.md"
    "QUICK_TEST_COMMANDS.md"
    "docker/systemd-ubuntu.md"
    "docker/test-local-dailycheckin.sh"
    "docker/test-comprehensive.sh"
)

# Move files to archive
for file in "${files_to_archive[@]}"; do
    if [ -f "$file" ]; then
        basename=$(basename "$file")
        echo "  Moving: $file → $ARCHIVE_DIR/$basename"
        git mv "$file" "$ARCHIVE_DIR/$basename" 2>/dev/null || mv "$file" "$ARCHIVE_DIR/$basename"
    else
        echo "  Skipped: $file (not found)"
    fi
done

echo ""
echo "✅ Archive complete!"
echo ""
echo "Archived files are now in: $ARCHIVE_DIR/"
echo ""
echo "Updated documentation structure:"
echo "  - docker/README.md (enhanced with systemd info)"
echo "  - docker/TEST_README.md (enhanced with commands)"
echo "  - TESTING_GUIDE.md (updated with proper links)"
echo ""
