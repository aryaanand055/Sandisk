`timescale 1ns / 1ps

module tb_speed_controller;
	reg [1:0] speed_sel;
	wire [7:0] duty;

	speed_controller uut (
		.speed_sel(speed_sel),
		.duty(duty)
	);

	initial begin
		speed_sel = 2'b00;
		#10;
		speed_sel = 2'b01;
		#10;
		speed_sel = 2'b10;
		#10;
		speed_sel = 2'b11;
		#10;
		$finish;
	end
endmodule