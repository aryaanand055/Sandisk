`timescale 1ns / 1ps

module tb_enable_controller;
	reg enable_sw;
	wire motor_en;

	enable_controller uut (
		.enable_sw(enable_sw),
		.motor_en(motor_en)
	);

	initial begin
		enable_sw = 1'b0;
		#10;
		enable_sw = 1'b1;
		#10;
		enable_sw = 1'b0;
		#10;
		$finish;
	end
endmodule