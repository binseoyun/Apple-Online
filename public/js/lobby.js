 function deleteRow(btn) {
      const row = btn.closest('tr');
      if (confirm("Are you sure you want to delete this room?")) {
        row.remove();
      }
    }