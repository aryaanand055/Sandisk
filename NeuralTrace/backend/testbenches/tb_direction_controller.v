`timescale 1ns / 1ps

module tb_direction_controller;
	reg dir_sel;
	wire in1;
	wire in2;

	direction_controller uut (
		.dir_sel(dir_sel),
		.in1(in1),
		.in2(in2)
	);

	initial begin
		dir_sel = 1'b0;
		#10;
		dir_sel = 1'b1;
		#10;
		dir_sel = 1'b0;
		#10;
		$finish;
	end
endmodule