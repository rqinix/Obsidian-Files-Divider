/*
 | --- 📂FILES DIVIDERS PLUGIN📄 ---
 | 
 | > Obsidian plugin that adds visual dividers above or below files and folders in the file explorer.
 | 
 | This plugin allows you to:
 | - Add/remove visual dividers above or below specific files and folders
 | - Toggle dividers on/off globally
 | - Clear all dividers at once
 | - Customize divider appearance through settings
 | 
 | Commands:
 | - Toggle files dividers on/off
 | - Clear all files dividers
 | 
 */

import { Plugin, Setting, PluginSettingTab, App, Notice, TFile, TFolder } from 'obsidian';

interface FilesDividersSettings {
    dividers: Array<{
        itemName: string;
        itemType: 'file' | 'folder';
        position: 'above' | 'below';
        style: 'line' | 'space' | 'gradient';
    }>;
    dividerColor: string;
    dividerThickness: number;
    enabled: boolean;
}

const DEFAULT_SETTINGS: FilesDividersSettings = {
    dividers: [],
    dividerColor: '#484848',
    dividerThickness: 1,
    enabled: true
};

export default class FilesDividersPlugin extends Plugin {
    settings: FilesDividersSettings;

    async onload() {
        await this.loadSettings();

        // --- Add ribbon icon ---
        this.addRibbonIcon('minus', 'Toggle files dividers', () => {
            this.toggleDividers();
        });

        // --- Add command to toggle dividers ---
        this.addCommand({
            id: 'toggle-files-dividers',
            name: 'Toggle files dividers on/off',
            callback: () => {
                this.toggleDividers();
            }
        });

        // --- Add command to clear all dividers ---
        this.addCommand({
            id: 'clear-all-dividers',
            name: 'Clear all files dividers',
            callback: () => {
                this.clearAllDividers();
            }
        });

        // --- Add settings tab ---
        this.addSettingTab(new FilesDividersSettingTab(this.app, this));

        // --- Apply dividers when plugin loads ---
        if (this.settings.enabled) {
            this.applyDividers();
        }

        // --- Watch for file explorer changes ---
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                if (this.settings.enabled) {
                    setTimeout(() => this.applyDividers(), 100);
                }
            })
        );

        // --- Add context menu option to both files and folders ---
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFolder || file instanceof TFile) {
                    menu.addSeparator();
                    
                    const itemType = file instanceof TFolder ? 'folder' : 'file';
                    const itemName = file.name;
                    
                    // --- Check existing dividers for this item ---
                    const existingAbove = this.settings.dividers.find(d => 
                        d.itemName === itemName && 
                        d.itemType === itemType && 
                        d.position === 'above'
                    );
                    const existingBelow = this.settings.dividers.find(d => 
                        d.itemName === itemName && 
                        d.itemType === itemType && 
                        d.position === 'below'
                    );
                    
                    // --- Add/Remove divider above ---
                    if (existingAbove) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Remove divider above')
                                .setIcon('x')
                                .onClick(() => {
                                    this.removeDividerFromItem(itemName, itemType, 'above');
                                });
                        });
                    } else {
                        menu.addItem((item) => {
                            item
                                .setTitle('Add divider above')
                                .setIcon('minus')
                                .onClick(() => {
                                    this.addDividerToItem(itemName, itemType, 'above');
                                });
                        });
                    }
                    
                    // --- Add/Remove divider below ---
                    if (existingBelow) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Remove divider below')
                                .setIcon('x')
                                .onClick(() => {
                                    this.removeDividerFromItem(itemName, itemType, 'below');
                                });
                        });
                    } else {
                        menu.addItem((item) => {
                            item
                                .setTitle('Add divider below')
                                .setIcon('minus')
                                .onClick(() => {
                                    this.addDividerToItem(itemName, itemType, 'below');
                                });
                        });
                    }

                    // --- Show remove all dividers option if any exist ---
                    if (existingAbove || existingBelow) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Remove all dividers')
                                .setIcon('trash')
                                .onClick(() => {
                                    this.removeDividersFromItem(itemName, itemType);
                                });
                        });
                    }
                }
            })
        );

        console.log('Files Dividers plugin loaded');
    }

    onunload() {
        this.removeDividers();
        console.log('Files Dividers plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.settings.enabled) {
            this.applyDividers();
        } else {
            this.removeDividers();
        }
    }

    addDividerToItem(itemName: string, itemType: 'file' | 'folder', position: 'above' | 'below') {
        const exists = this.settings.dividers.find(
            d => d.itemName === itemName && d.itemType === itemType && d.position === position
        );
        
        if (exists) {
            new Notice(`Divider already exists ${position} ${itemType} "${itemName}"`);
            return;
        }

        this.settings.dividers.push({
            itemName,
            itemType,
            position,
            style: 'line'
        });

        this.saveSettings();
        new Notice(`Added divider ${position} ${itemType} "${itemName}"`);
    }

    removeDividerFromItem(itemName: string, itemType: 'file' | 'folder', position: 'above' | 'below') {
        const before = this.settings.dividers.length;
        this.settings.dividers = this.settings.dividers.filter(
            d => !(d.itemName === itemName && d.itemType === itemType && d.position === position)
        );
        
        if (this.settings.dividers.length < before) {
            this.saveSettings();
            new Notice(`Removed divider ${position} ${itemType} "${itemName}"`);
        }
    }

    removeDividersFromItem(itemName: string, itemType: 'file' | 'folder') {
        const removedCount = this.settings.dividers.length;
        this.settings.dividers = this.settings.dividers.filter(
            d => !(d.itemName === itemName && d.itemType === itemType)
        );
        const newCount = this.settings.dividers.length;
        
        if (removedCount > newCount) {
            this.saveSettings();
            new Notice(`Removed ${removedCount - newCount} divider(s) from ${itemType} "${itemName}"`);
        }
    }

    clearAllDividers() {
        if (this.settings.dividers.length === 0) {
            new Notice('No dividers to clear');
            return;
        }

        const count = this.settings.dividers.length;
        this.settings.dividers = [];
        this.saveSettings();
        new Notice(`Cleared ${count} divider(s)`);
    }

    applyDividers() {
        this.removeDividers();

        if (this.settings.dividers.length === 0) {
            return;
        }

        // --- Create CSS horizontal dividers ---
        const cssRules = this.settings.dividers.map(divider => {
            const pseudoElement = divider.position === 'above' ? 'before' : 'after';
            const itemClass = divider.itemType === 'folder' ? 'nav-folder' : 'nav-file';
            
            return `
                /* --- Divider styles for files and folders --- */
                .${itemClass}-divider-${divider.position}[data-item="${divider.itemName}"][data-type="${divider.itemType}"]::${pseudoElement} {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    width: 100%;
                    height: ${this.settings.dividerThickness}px;
                    background-color: ${this.settings.dividerColor};
                    border-radius: ${this.settings.dividerThickness / 2}px;
                    opacity: 0.6;
                    ${divider.position === 'above' ? 
                        `top: -${8 + this.settings.dividerThickness}px;` : 
                        `bottom: -${8 + this.settings.dividerThickness}px;`
                    }
                }

                /* --- Add spacing and position to dividers --- */
                .${itemClass}-divider-${divider.position}[data-item="${divider.itemName}"][data-type="${divider.itemType}"] {
                    position: relative;
                    ${divider.position === 'above' ? 'margin-top: 16px;' : 'margin-bottom: 16px;'}
                }
            `;
        }).join('\n');

        // --- Add CSS ---
        const styleElement = document.createElement('style');
        styleElement.id = 'files-dividers-styles';
        styleElement.textContent = cssRules;
        document.head.appendChild(styleElement);

        // --- Add classes to file and folder elements ---
        this.addDividerClasses();

        console.log('Applied files dividers:', this.settings.dividers.length);
    }

    addDividerClasses() {
        const fileExplorer = document.querySelector('.nav-files-container');
        if (!fileExplorer) return;

        // --- Remove existing classes first ---
        document.querySelectorAll('[data-item]').forEach(el => {
            el.removeAttribute('data-item');
            el.removeAttribute('data-type');
            el.classList.remove('nav-folder-divider-above');
            el.classList.remove('nav-folder-divider-below');
            el.classList.remove('nav-file-divider-above');
            el.classList.remove('nav-file-divider-below');
        });

        this.settings.dividers.forEach(divider => {
            // --- Handle folders ---
            if (divider.itemType === 'folder') {
                const folders = fileExplorer.querySelectorAll('.nav-folder');
                folders.forEach(folder => {
                    const titleElement = folder.querySelector('.nav-folder-title');
                    if (titleElement) {
                        const folderName = titleElement.textContent?.trim();
                        if (folderName === divider.itemName) {
                            folder.classList.add(`nav-folder-divider-${divider.position}`);
                            folder.setAttribute('data-item', divider.itemName);
                            folder.setAttribute('data-type', 'folder');
                            console.log(`Added divider class to folder: ${folderName} (${divider.position})`);
                        }
                    }
                });
            }
            
            // --- Handle files ---
            else if (divider.itemType === 'file') {
                const files = fileExplorer.querySelectorAll('.nav-file');
                files.forEach(file => {
                    const titleElement = file.querySelector('.nav-file-title');
                    if (titleElement) {
                        const fileName = titleElement.textContent?.trim();
                        const fileNameWithoutExt = fileName?.replace(/\.[^/.]+$/, "");
                        const dividerNameWithoutExt = divider.itemName.replace(/\.[^/.]+$/, "");
                        if (fileName === divider.itemName || 
                            fileNameWithoutExt === dividerNameWithoutExt ||
                            fileName === dividerNameWithoutExt ||
                            fileNameWithoutExt === divider.itemName
                        ) {
                            file.classList.add(`nav-file-divider-${divider.position}`);
                            file.setAttribute('data-item', divider.itemName);
                            file.setAttribute('data-type', 'file');
                        }
                    }
                });
            }
        });
    }

    removeDividers() {
        const existingStyles = document.getElementById('files-dividers-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        // --- Remove classes and attributes ---
        document.querySelectorAll('[data-item]').forEach(el => {
            el.removeAttribute('data-item');
            el.removeAttribute('data-type');
            el.removeClass('nav-folder-divider-above');
            el.removeClass('nav-folder-divider-below');
            el.removeClass('nav-file-divider-above');
            el.removeClass('nav-file-divider-below');
        });
    }

    toggleDividers() {
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
        const status = this.settings.enabled ? 'enabled' : 'disabled';
        new Notice(`Files dividers ${status}`);
    }
}

/**
 * Settings tab for Files Dividers plugin
 */
class FilesDividersSettingTab extends PluginSettingTab {
    plugin: FilesDividersPlugin;

    constructor(app: App, plugin: FilesDividersPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Files Dividers Settings' });

        // --- Enable/disable toggle ---
        new Setting(containerEl)
            .setName('Enable files dividers')
            .setDesc('Turn dividers on or off globally for both files and folders')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.enabled = value;
                        await this.plugin.saveSettings();
                    })
            );

        // --- Divider color setting ---
        new Setting(containerEl)
            .setName('Divider color')
            .setDesc('Color of the divider lines')
            .addColorPicker(color => 
                color
                    .setValue(this.plugin.settings.dividerColor)
                    .onChange(async (value) => {
                        this.plugin.settings.dividerColor = value;
                        await this.plugin.saveSettings();
                    })
            );

        // --- Divider thickness setting ---
        new Setting(containerEl)
            .setName('Divider thickness')
            .setDesc('Thickness of divider lines in pixels')
            .addSlider(slider =>
                slider
                    .setLimits(1, 5, 1)
                    .setValue(this.plugin.settings.dividerThickness)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.dividerThickness = value;
                        await this.plugin.saveSettings();
                    })
            );

        // --- Instructions ---
        containerEl.createEl('h3', { text: 'How to use' });
        containerEl.createEl('p', { 
            text: 'Right-click or Press on any file or folder in the file explorer to add or remove dividers above or below it. Dividers appear as subtle horizontal lines to organize your vault structure.' 
        });

        // --- Current dividers list ---
        containerEl.createEl('h3', { text: 'Current Dividers' });

        if (this.plugin.settings.dividers.length === 0) {
            containerEl.createEl('p', { 
                text: 'No dividers configured. Right-click on files or folders to add dividers.',
                cls: 'setting-item-description'
            });
        } 
        
        else {
            const folderDividers = this.plugin.settings.dividers.filter(d => d.itemType === 'folder');
            const fileDividers = this.plugin.settings.dividers.filter(d => d.itemType === 'file');

            if (folderDividers.length > 0) {
                containerEl.createEl('h4', { text: 'Folder Dividers' });
                folderDividers.forEach((divider, index) => {
                    new Setting(containerEl)
                        .setName(`📁 ${divider.itemName}`)
                        .setDesc(`Divider ${divider.position} the "${divider.itemName}" folder`)
                        .addButton(button =>
                            button
                                .setButtonText('Remove')
                                .setWarning()
                                .onClick(async () => {
                                    const globalIndex = this.plugin.settings.dividers.indexOf(divider);
                                    this.plugin.settings.dividers.splice(globalIndex, 1);
                                    await this.plugin.saveSettings();
                                    this.display();
                                })
                        );
                });
            }

            if (fileDividers.length > 0) {
                containerEl.createEl('h4', { text: 'File Dividers' });
                fileDividers.forEach((divider, index) => {
                    new Setting(containerEl)
                        .setName(`📄 ${divider.itemName}`)
                        .setDesc(`Divider ${divider.position} the "${divider.itemName}" file`)
                        .addButton(button =>
                            button
                                .setButtonText('Remove')
                                .setWarning()
                                .onClick(async () => {
                                    const globalIndex = this.plugin.settings.dividers.indexOf(divider);
                                    this.plugin.settings.dividers.splice(globalIndex, 1);
                                    await this.plugin.saveSettings();
                                    this.display();
                                })
                        );
                });
            }

            // --- Clear all button ---
            new Setting(containerEl)
                .addButton(button =>
                    button
                        .setButtonText('Clear all dividers')
                        .setWarning()
                        .onClick(async () => {
                            this.plugin.clearAllDividers();
                            this.display();
                        })
                );
        }
    }
}