/**
 * Namespace: browser.commands
 * Generated from Mozilla sources
 *
 * Use the commands API to add keyboard shortcuts that trigger actions in your extension, for example, an action to open the browser action or send a command to the xtension.
 * Permissions: "manifest:commands"
 *
 * Comments found in source JSON schema files:
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
import { Manifest } from "./manifest";
import { Events } from "./events";

export namespace Commands {
    export interface Command {

        /**
         * The name of the Extension Command
         * Optional.
         */
        name?: string;

        /**
         * The Extension Command description
         * Optional.
         */
        description?: string;

        /**
         * The shortcut active for this command, or blank if not active.
         * Optional.
         */
        shortcut?: string;
    }

    /**
     * The new description for the command.
     */
    export interface UpdateDetailType {

        /**
         * The name of the command.
         */
        name: string;

        /**
         * The new description for the command.
         * Optional.
         */
        description?: string;

        /**
         * Optional.
         */
        shortcut?: Manifest.KeyName;
    }

    export interface Static {

        /**
         * Update the details of an already defined command.
         *
         * @param detail The new description for the command.
         * @returns Promise<void>
         */
        update(detail: UpdateDetailType): Promise<void>;

        /**
         * Reset a command's details to what is specified in the manifest.
         *
         * @param name The name of the command.
         * @returns Promise<void>
         */
        reset(name: string): Promise<void>;

        /**
         * Returns all the registered extension commands for this extension and their shortcut (if active).
         *
         * @returns Promise<Command[]> Called to return the registered commands.
         */
        getAll(): Promise<Command[]>;

        /**
         * Fired when a registered command is activated using a keyboard shortcut.
         *
         * @param command
         */
        onCommand: Events.Event<(command: string) => void>;
    }
}
