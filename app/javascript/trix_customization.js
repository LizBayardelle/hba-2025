import Trix from "trix"

// Register heading levels 2-6 as custom block attributes (heading1 is built-in)
Trix.config.blockAttributes.heading2 = {
  tagName: "h2",
  terminal: true,
  breakOnReturn: true,
  group: false
}

Trix.config.blockAttributes.heading3 = {
  tagName: "h3",
  terminal: true,
  breakOnReturn: true,
  group: false
}

Trix.config.blockAttributes.heading4 = {
  tagName: "h4",
  terminal: true,
  breakOnReturn: true,
  group: false
}

Trix.config.blockAttributes.heading5 = {
  tagName: "h5",
  terminal: true,
  breakOnReturn: true,
  group: false
}

Trix.config.blockAttributes.heading6 = {
  tagName: "h6",
  terminal: true,
  breakOnReturn: true,
  group: false
}

// Customize Trix editor to add heading dropdown
document.addEventListener('trix-initialize', function(event) {
  const editor = event.target;
  const toolbar = editor.toolbarElement;

  // Find the heading button group
  const blockTools = toolbar.querySelector('.trix-button-group--block-tools');

  if (blockTools) {
    // Remove the default heading button
    const headingButton = blockTools.querySelector('[data-trix-attribute="heading1"]');
    if (headingButton) {
      headingButton.remove();
    }

    // Create a dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'trix-heading-dropdown';
    dropdownContainer.style.cssText = 'display: inline-block;';

    // Create the main dropdown button
    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.className = 'trix-button';
    dropdownButton.innerHTML = '<strong>H</strong> <span style="font-size: 10px;">▼</span>';
    dropdownButton.title = 'Headings';
    dropdownButton.style.cssText = 'height: 100%; display: flex; align-items: center; justify-content: center;';

    // Create the dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'trix-heading-menu';
    dropdownMenu.style.cssText = `
      display: none;
      position: fixed;
      background: white;
      border: 2px solid #E8EEF1;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      min-width: 150px;
      margin-top: 4px;
    `;

    // Create heading options
    const headings = [
      { level: 1, label: 'Heading 1', size: '1.875em', weight: '700' },
      { level: 2, label: 'Heading 2', size: '1.5em', weight: '700' },
      { level: 3, label: 'Heading 3', size: '1.25em', weight: '600' },
      { level: 4, label: 'Heading 4', size: '1.1em', weight: '600' },
      { level: 5, label: 'Heading 5', size: '1em', weight: '600' },
      { level: 6, label: 'Heading 6', size: '0.925em', weight: '600' }
    ];

    headings.forEach(heading => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'trix-heading-option';
      option.textContent = heading.label;
      option.style.cssText = `
        display: block;
        width: 100%;
        text-align: left;
        padding: 8px 12px;
        border: none;
        background: none;
        font-size: ${heading.size};
        font-weight: ${heading.weight};
        color: #1D1D1F;
        cursor: pointer;
        font-family: 'Space Grotesk', sans-serif;
      `;

      option.addEventListener('mouseenter', function() {
        this.style.background = '#E8EEF1';
      });

      option.addEventListener('mouseleave', function() {
        this.style.background = 'none';
      });

      option.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Apply the heading
        editor.editor.activateAttribute(`heading${heading.level}`);

        // Close dropdown
        dropdownMenu.style.display = 'none';
      });

      dropdownMenu.appendChild(option);
    });

    // Add "Normal text" option
    const normalOption = document.createElement('button');
    normalOption.type = 'button';
    normalOption.className = 'trix-heading-option';
    normalOption.textContent = 'Normal text';
    normalOption.style.cssText = `
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      border: none;
      background: none;
      font-size: 1em;
      color: #566e78;
      cursor: pointer;
      border-top: 1px solid #E8EEF1;
      margin-top: 4px;
      padding-top: 12px;
    `;

    normalOption.addEventListener('mouseenter', function() {
      this.style.background = '#E8EEF1';
    });

    normalOption.addEventListener('mouseleave', function() {
      this.style.background = 'none';
    });

    normalOption.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Remove all heading attributes
      headings.forEach(h => {
        editor.editor.deactivateAttribute(`heading${h.level}`);
      });

      // Close dropdown
      dropdownMenu.style.display = 'none';
    });

    dropdownMenu.appendChild(normalOption);

    // Toggle dropdown on button click
    dropdownButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const isVisible = dropdownMenu.style.display === 'block';

      if (isVisible) {
        dropdownMenu.style.display = 'none';
      } else {
        // Position the dropdown relative to the button
        const rect = dropdownButton.getBoundingClientRect();
        dropdownMenu.style.top = `${rect.bottom + 4}px`;
        dropdownMenu.style.left = `${rect.left}px`;
        dropdownMenu.style.display = 'block';
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdownContainer.contains(e.target)) {
        dropdownMenu.style.display = 'none';
      }
    });

    // Assemble the dropdown
    dropdownContainer.appendChild(dropdownButton);
    dropdownContainer.appendChild(dropdownMenu);

    // Insert the dropdown at the beginning of block tools
    blockTools.insertBefore(dropdownContainer, blockTools.firstChild);

    // Split block-tools after the code (<>) button into a separate group
    // so the toolbar can naturally wrap into two rows on narrow screens.
    const codeButton = blockTools.querySelector('[data-trix-attribute="code"]');
    if (codeButton) {
      const listGroup = document.createElement('span');
      listGroup.className = 'trix-button-group trix-button-group--list-tools';
      listGroup.setAttribute('data-trix-button-group', 'list-tools');

      // Move every sibling after the code button into the new group
      let next = codeButton.nextElementSibling;
      while (next) {
        const moving = next;
        next = next.nextElementSibling;
        listGroup.appendChild(moving);
      }

      // Insert the new group right after block-tools in the button row
      blockTools.parentNode.insertBefore(listGroup, blockTools.nextSibling);

      // Move the attach button from file-tools into block-tools, after code
      const fileTools = toolbar.querySelector('.trix-button-group--file-tools');
      if (fileTools) {
        const attachButton = fileTools.querySelector('[data-trix-action="attachFiles"]');
        if (attachButton) {
          codeButton.after(attachButton);
          if (fileTools.children.length === 0) {
            fileTools.remove();
          }
        }
      }
    }

    // Add expand/collapse button for writing mode (after undo/redo)
    const buttonRow = toolbar.querySelector('.trix-button-row');
    if (buttonRow) {
      const expandGroup = document.createElement('span');
      expandGroup.className = 'trix-button-group trix-button-group--expand-tools';
      expandGroup.setAttribute('data-trix-button-group', 'expand-tools');

      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'trix-button trix-button--icon-expand';
      expandBtn.title = 'Writing mode';
      expandBtn.innerHTML = '<i class="fa-solid fa-expand" style="font-size: 12px; color: #8E8E93;"></i>';
      expandBtn.style.cssText = 'display: flex; align-items: center; justify-content: center;';

      expandBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        editor.dispatchEvent(new CustomEvent('trix-toggle-writing-mode', { bubbles: true }));
      });

      expandGroup.appendChild(expandBtn);
      buttonRow.appendChild(expandGroup);
    }
  }
});
