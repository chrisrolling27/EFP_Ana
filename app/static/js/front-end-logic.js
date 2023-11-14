
// ------------------------------------------
// Updating card preview - Card creation page
// ------------------------------------------
$(document).ready(function(){
    $("#inputCardHolderName").keyup(function(){
        // Getting the current value of textarea
        let currentText = $(this).val();		
         // Setting the Div content
        $(".preview-name").text(currentText);
    }); 
});
	
