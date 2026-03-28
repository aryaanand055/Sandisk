module pwm_generator #(
	parameter WIDTH = 8,
	parameter CLK_DIV = 20
) (
	input wire clk,
	input wire rst,
	input wire [WIDTH-1:0] duty,
	output reg pwm_out
);
	reg [WIDTH-1:0] pwm_counter;
	reg [31:0] div_counter;
	wire tick;

	assign tick = (div_counter == CLK_DIV - 1);

	always @(posedge clk or posedge rst) begin
		if (rst) begin
			div_counter <= 32'd0;
		end else begin
			if (tick)
				div_counter <= 32'd0;
			else
				div_counter <= div_counter + 1'b1;
		end
	end

	always @(posedge clk or posedge rst) begin
		if (rst) begin
			pwm_counter <= {WIDTH{1'b0}};
			pwm_out <= 1'b0;
		end else if (tick) begin
			pwm_counter <= pwm_counter + 1'b1;

			if (pwm_counter < duty)
				pwm_out <= 1'b1;
			else
				pwm_out <= 1'b0;
		end
	end
endmodule