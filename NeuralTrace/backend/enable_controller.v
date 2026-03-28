module enable_controller (
	input wire enable_sw,
	output wire motor_en
);
	assign motor_en = enable_sw;
endmodule