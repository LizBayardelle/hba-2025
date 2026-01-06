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
      { level: 1, label: 'Heading 1', size: '2em' },
      { level: 2, label: 'Heading 2', size: '1.5em' },
      { level: 3, label: 'Heading 3', size: '1.25em' },
      { level: 4, label: 'Heading 4', size: '1.1em' },
      { level: 5, label: 'Heading 5', size: '1em' },
      { level: 6, label: 'Heading 6', size: '0.9em' }
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
        font-weight: 600;
        color: #1d3e4c;
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
  }
});
