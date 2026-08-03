# serum2-db-sync

Serum/Serum 2 stores user-assigned tags and ratings in a local sqlite database (/Serum Presets/System/presets.db).
When this database becomes corrupted, all tags and ratings will be lost.

This is a CLI utility which tries to add the missing functionality of baking this data back into the individual preset files.

__WARNING: Consider this an untested prototype. While backup mechanisms are part of the tool, I recommend to back up the database and preset files before using the tool.__

## Installation

Install NodeJS 20 or greater.
Install pnpm.
Clone the repo.
Install repo using `pnpm i`.
Execute `pnpm start` for interactive CLI.

